#!/usr/bin/env python3
"""Small JSON bridge around Mandown's documented Python API."""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import io
import json
import os
import sys
import traceback
from dataclasses import asdict
from pathlib import Path
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile

import mandown


def _call_quietly(function, *args, **kwargs):
    captured = io.StringIO()
    with contextlib.redirect_stdout(captured):
        result = function(*args, **kwargs)
    diagnostic = captured.getvalue().strip()
    if diagnostic:
        print(diagnostic, file=sys.stderr)
    return result


def _encoded_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _error_payload(error: Exception) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "error": str(error),
        "errorType": type(error).__name__,
    }
    if isinstance(error, mandown.AniListRateLimitError):
        payload["retryAfter"] = error.retry_after
        payload["resetAt"] = error.reset_at
    return payload


async def search(client: mandown.AniListClient, title: str) -> dict[str, Any]:
    response = await client.search_manga(title, per_page=12, include_details=True)
    return {
        "items": [
            {
                "manga": asdict(item),
                "sources": [
                    asdict(source)
                    for source in client.extract_supported_sources(item.external_links)
                ],
            }
            for item in response.items
        ],
        "pageInfo": asdict(response.page_info),
    }


def configure_discovery_environment() -> None:
    root = Path(__file__).resolve().parent.parent
    os.environ.setdefault(
        "MANDOWN_JEV_CACHE", str(root / "storage/mandown/jev.sqlite3")
    )
    os.environ.setdefault(
        "MANDOWN_SEARCH_LOG", str(root / "storage/mandown/search.jsonl")
    )
    os.environ.setdefault("MANDOWN_JEV_CACHE_REVISION", "1")
    for name in ("MANDOWN_JEV_CACHE", "MANDOWN_SEARCH_LOG"):
        value = os.environ[name]
        if name == "MANDOWN_JEV_CACHE" and value == "off":
            continue
        configured = Path(value)
        if not configured.is_absolute():
            os.environ[name] = str(root / configured)


async def search_sources(anilist_id: int) -> dict[str, Any]:
    configure_discovery_environment()
    response = await mandown.search_sources(anilist_id)
    return response.asdict()


async def manga_details(
    client: mandown.AniListClient, anilist_id: int
) -> dict[str, Any]:
    manga = await client.get_manga(anilist_id)
    sources = client.extract_supported_sources(manga.external_links)
    return {
        "manga": asdict(manga),
        "sources": [asdict(source) for source in sources],
    }


def source_details(url: str, *, quiet: bool) -> dict[str, Any]:
    comic = _call_quietly(mandown.query, url) if quiet else mandown.query(url)
    metadata = comic.metadata.asdict()
    return {
        "metadata": metadata,
        "chapters": [
            {
                "title": chapter.title,
                "url": chapter.url,
                "slug": chapter.slug,
                "chapterNumber": chapter.chapter_number,
            }
            for chapter in comic.chapters
        ],
    }


def download(
    url: str,
    chapter_numbers: list[str],
    destination: str,
    *,
    download_root: str | None,
    quiet: bool,
) -> dict[str, Any]:
    root = Path(download_root or destination).resolve()
    requested = Path(destination).resolve()
    if requested != root and root not in requested.parents:
        raise ValueError("Download destination escapes MANDOWN_DOWNLOAD_ROOT.")
    requested.mkdir(parents=True, exist_ok=True)

    comic = _call_quietly(mandown.query, url) if quiet else mandown.query(url)
    wanted = set(chapter_numbers)
    selected_entries = [
        (chapter, str(chapter.chapter_number or index))
        for index, chapter in enumerate(comic.chapters, start=1)
        if str(chapter.chapter_number) in wanted
        or chapter.slug in wanted
        or str(index) in wanted
    ]
    selected = [chapter for chapter, _ in selected_entries]
    if not selected:
        raise ValueError("None of the requested chapters exist in this source.")
    selected_identifiers = {
        identifier
        for chapter, effective_number in selected_entries
        for identifier in (
            str(chapter.chapter_number),
            chapter.slug,
            effective_number,
        )
    }
    missing = wanted - selected_identifiers
    if missing:
        raise ValueError(f"Requested chapters are missing: {sorted(missing)}")

    # BaseComic.chapters is the documented chapter list. Restricting that list
    # lets download() fetch an exact non-contiguous selection.
    comic.chapters = selected
    download_arguments = {
        "threads": 4,
        "panel_size": None,
        "only_download_missing": True,
        "raise_on_failed_download": True,
    }
    if quiet:
        _, _, thread = _call_quietly(
            mandown.download,
            comic,
            requested,
            **download_arguments,
        )
    else:
        _, _, thread = mandown.download(comic, requested, **download_arguments)
    comic_root = requested / comic.metadata.title_slug
    archives = []
    for chapter, effective_number in selected_entries:
        chapter_path = comic_root / chapter.slug
        image_paths = sorted(
            (
                path
                for path in chapter_path.iterdir()
                if path.is_file()
                and path.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
            ),
            key=lambda path: path.name,
        )
        if not image_paths:
            raise ValueError(f"No downloaded images found for chapter {chapter.title}.")
        archive_path = requested / f"{chapter.slug}.cbz"
        with ZipFile(
            archive_path,
            mode="w",
            compression=ZIP_DEFLATED,
            compresslevel=6,
        ) as archive:
            for image_path in image_paths:
                archive.write(image_path, arcname=image_path.name)
        archives.append(
            {
                "chapterNumber": effective_number,
                "title": chapter.title,
                "slug": chapter.slug,
                "path": str(archive_path),
            }
        )
    files = [
        str(path.relative_to(requested))
        for path in comic_root.rglob("*")
        if path.is_file()
    ]
    cover_path = next(comic_root.glob("cover.*"), None)
    return {
        "title": comic.metadata.title,
        "titleSlug": comic.metadata.title_slug,
        "destination": str(comic_root),
        "chapterNumbers": chapter_numbers,
        "files": files,
        "archives": archives,
        "coverPath": str(cover_path) if cover_path else None,
        "threadAlive": thread.is_alive(),
    }


async def dispatch(
    args: list[str],
    client: mandown.AniListClient,
    *,
    request_env: dict[str, str] | None = None,
    quiet: bool,
) -> dict[str, Any]:
    if not args:
        raise ValueError("Mandown command is required.")
    command = args[0]
    if command == "health":
        return {"pid": os.getpid()}
    if command == "search" and len(args) == 2:
        return await search(client, args[1])
    if command == "search-sources" and len(args) == 2:
        return await search_sources(int(args[1]))
    if command == "manga-details" and len(args) == 2:
        return await manga_details(client, int(args[1]))
    if command == "source-details" and len(args) == 2:
        return await asyncio.to_thread(source_details, args[1], quiet=quiet)
    if command == "download" and len(args) >= 4:
        return await asyncio.to_thread(
            download,
            args[1],
            args[3:],
            args[2],
            download_root=(request_env or {}).get("MANDOWN_DOWNLOAD_ROOT"),
            quiet=quiet,
        )
    raise ValueError(f"Unsupported Mandown command: {command}")


async def serve() -> None:
    protocol_stdout = sys.stdout
    # Mandown adapters occasionally print diagnostics. Keep stdout reserved for
    # protocol frames while service mode is active.
    sys.stdout = sys.stderr
    write_lock = asyncio.Lock()
    tasks: set[asyncio.Task[None]] = set()

    async def respond(request: dict[str, Any], client: mandown.AniListClient) -> None:
        request_id = request.get("id")
        try:
            raw_args = request.get("args")
            raw_env = request.get("env")
            if not isinstance(request_id, str) or not isinstance(raw_args, list):
                raise ValueError("Invalid Mandown service request.")
            if not all(isinstance(value, str) for value in raw_args):
                raise ValueError("Mandown arguments must be strings.")
            if raw_env is not None and (
                not isinstance(raw_env, dict)
                or not all(
                    isinstance(key, str) and isinstance(value, str)
                    for key, value in raw_env.items()
                )
            ):
                raise ValueError("Mandown request environment is invalid.")
            result = await dispatch(
                raw_args,
                client,
                request_env=raw_env,
                quiet=False,
            )
            frame = {"id": request_id, "result": result}
        except Exception as error:  # Mandown surfaces requests/source exceptions.
            traceback.print_exc(file=sys.stderr)
            frame = {"id": request_id, **_error_payload(error)}
        async with write_lock:
            protocol_stdout.write(_encoded_json(frame) + "\n")
            protocol_stdout.flush()

    async with mandown.AniListClient() as client:
        while True:
            line = await asyncio.to_thread(sys.stdin.readline)
            if not line:
                break
            try:
                request = json.loads(line)
                if not isinstance(request, dict):
                    raise ValueError("Mandown service frame must be an object.")
            except Exception as error:
                traceback.print_exc(file=sys.stderr)
                protocol_stdout.write(
                    _encoded_json({"id": None, **_error_payload(error)}) + "\n"
                )
                protocol_stdout.flush()
                continue
            task = asyncio.create_task(respond(request, client))
            tasks.add(task)
            task.add_done_callback(tasks.discard)
        if tasks:
            await asyncio.gather(*tasks)


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    search_parser = subparsers.add_parser("search")
    search_parser.add_argument("title")
    manga_parser = subparsers.add_parser("manga-details")
    manga_parser.add_argument("anilist_id", type=int)
    discovery_parser = subparsers.add_parser("search-sources")
    discovery_parser.add_argument("anilist_id", type=int)
    source_parser = subparsers.add_parser("source-details")
    source_parser.add_argument("url")
    download_parser = subparsers.add_parser("download")
    download_parser.add_argument("url")
    download_parser.add_argument("destination")
    download_parser.add_argument("chapters", nargs="+")
    subparsers.add_parser("health")
    subparsers.add_parser("serve")
    args = parser.parse_args()

    if args.command == "serve":
        asyncio.run(serve())
        return

    command_args = [args.command]
    if args.command == "search":
        command_args.append(args.title)
    elif args.command in {"manga-details", "search-sources"}:
        command_args.append(str(args.anilist_id))
    elif args.command == "source-details":
        command_args.append(args.url)
    elif args.command == "download":
        command_args.extend([args.url, args.destination, *args.chapters])

    async def run_once() -> dict[str, Any]:
        captured = io.StringIO()
        download_root = os.environ.get("MANDOWN_DOWNLOAD_ROOT")
        with contextlib.redirect_stdout(captured):
            async with mandown.AniListClient() as client:
                result = await dispatch(
                    command_args,
                    client,
                    request_env=(
                        {"MANDOWN_DOWNLOAD_ROOT": download_root}
                        if download_root
                        else None
                    ),
                    quiet=True,
                )
        diagnostic = captured.getvalue().strip()
        if diagnostic:
            print(diagnostic, file=sys.stderr)
        return result

    print(_encoded_json(asyncio.run(run_once())))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # Mandown surfaces requests/source exceptions.
        traceback.print_exc(file=sys.stderr)
        print(_encoded_json(_error_payload(error)))
        raise SystemExit(1) from error
