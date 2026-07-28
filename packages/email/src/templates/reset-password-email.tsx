import {
  Button,
  Container,
  Heading,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components"
import React from "react"

void React

type Props = {
  name: string
  url: string
}

const ResetPasswordEmail = ({ name, url }: Props) => (
  <Tailwind
    config={{
      theme: {
        extend: {
          colors: {
            default: "#ffffff",
            subtle: "#f3f4f6",
            brand: "#FF4F4F",
          },
          borderColor: {
            subtle: "#e5e7eb",
          },
        },
      },
    }}
  >
    <Html lang="tr" className="bg-subtle">
      <Preview>NovoraScans parolanı sıfırla</Preview>
      <Heading className="mx-0 my-4 p-0 text-center font-semibold text-[24px] text-black">
        NovoraScans
      </Heading>
      <Container className="my-12 rounded-lg border border-subtle border-solid bg-default">
        <Container className="px-8 py-4">
          <Text className="font-bold text-2xl">Parolanı sıfırla</Text>
          <Text>
            Merhaba {name}, parolanı sıfırlama isteği aldık. Yeni parolanı
            belirlemek için aşağıdaki bağlantıyı kullan. Bağlantı bir saat
            boyunca geçerlidir.
          </Text>
          <Section>
            <Button
              href={url}
              className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
            >
              Parolamı sıfırla
            </Button>
          </Section>
          <Text>Düğme çalışmazsa bu bağlantıyı tarayıcına kopyala: {url}</Text>
        </Container>
        <Container className="border-subtle border-t border-solid px-8">
          <Text>
            Bu isteği sen göndermediysen e-postayı yok say; parolan değişmez.
          </Text>
        </Container>
      </Container>
    </Html>
  </Tailwind>
)

export default ResetPasswordEmail
