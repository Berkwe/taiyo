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

const SignUpEmail = ({ name, url }: Props) => (
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
      <Preview>NovoraScans hesabını doğrula</Preview>
      <Heading className="mx-0 my-4 p-0 text-center font-semibold text-[24px] text-black">
        NovoraScans
      </Heading>
      <Container className="my-12 rounded-lg border border-subtle border-solid bg-default">
        <Container className="px-8 py-4">
          <Text className="font-bold text-2xl">E-posta adresini doğrula</Text>
          <Text>
            Merhaba {name}, hesabını etkinleştirmek için aşağıdaki bağlantıyı
            kullan. Bu bağlantı bir saat boyunca geçerlidir.
          </Text>
          <Section>
            <Button
              href={url}
              className="rounded-md bg-brand px-3 py-1.5 text-sm text-white"
            >
              E-postamı doğrula
            </Button>
          </Section>
          <Text>Düğme çalışmazsa bu bağlantıyı tarayıcına kopyala: {url}</Text>
        </Container>
        <Container className="border-subtle border-t border-solid px-8">
          <Text>Bu hesabı sen oluşturmadıysan bu e-postayı yok say.</Text>
        </Container>
      </Container>
    </Html>
  </Tailwind>
)

export default SignUpEmail
