import Image from "next/image";
import Link from "next/link";

const steps = [
  {
    title: "① Amazonで購入",
    description: "匿名でマッチした誰かの欲しいものリストから、3000〜4000円の商品を選んでギフト購入。",
  },
  {
    title: "② りんごを引く",
    description: "スクショ提出が承認されたら抽選権を獲得。24時間かけて開くりんごカードでドキドキ体験。",
  },
  {
    title: "③ 欲しいものが届く",
    description: "引いたりんごの種類に応じて、あなたのリストから購入してもらえる回数やチケットが増えます。",
  },
];

const features = [
  "メールアドレスだけですぐ登録",
  "友達紹介で上位りんごの確率アップ",
  "毒りんごでもフェアになる動的RTPシステム",
];

export default function Home() {
  return (
    <main className="relative isolate min-h-screen bg-ringo-bg px-5 pb-20 pt-12 text-ringo-ink md:px-10 lg:px-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-24">
        <section className="grid items-center gap-10 rounded-3xl bg-white/80 px-6 py-12 shadow-ringo-card backdrop-blur-sm md:grid-cols-2 md:px-12">
          <div className="space-y-6 text-center md:text-left">
            <p className="inline-block rounded-full bg-ringo-purple/40 px-4 py-1 text-sm font-semibold text-ringo-red">
              欲しいものを交換し合うコミュニティ
            </p>
            <h1 className="font-logo text-4xl font-bold leading-tight text-ringo-red md:text-5xl">
              りんご会♪
            </h1>
            <p className="text-lg leading-relaxed">
              Amazonの欲しいものリストを交換し合い、りんごの抽選でドキドキ感を楽しむ女性向けコミュニティ。
              購入→抽選→ご褒美のループで、フェアに盛り上がろう！
            </p>
            <div className="flex flex-col gap-3 text-sm text-ringo-ink/80 sm:flex-row">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex flex-1 items-center gap-2 rounded-2xl bg-ringo-bg px-4 py-2"
                >
                  <span className="text-lg">✨</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/register" className="btn-primary inline-flex justify-center px-8">
                新規登録
              </Link>
              <Link
                href="/login"
                className="rounded-ringo-pill border border-ringo-pink px-8 py-3 text-center text-lg font-semibold text-ringo-pink transition hover:bg-ringo-pink/10"
              >
                ログイン
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div className="absolute -inset-4 rounded-full bg-ringo-purple/30 blur-3xl" aria-hidden />
            <Image
              src="/images/character/ringo_kai_main_character.png"
              alt="りんご会のメインキャラクター"
              width={420}
              height={420}
              priority
              className="relative drop-shadow-2xl"
            />
          </div>
        </section>

        <section className="space-y-8 rounded-3xl bg-white/90 px-6 py-12 shadow-ringo-card backdrop-blur-sm md:px-12">
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold text-ringo-red">りんご会♪とは？</p>
            <h2 className="font-logo text-3xl font-bold text-ringo-ink">シンプルだけど、公平で温かい仕組み</h2>
            <p className="text-lg text-ringo-ink/80">
              README と TECHNICAL_SPEC のフローに沿って、登録から抽選までをガードしながら進行。
              全員が同じ順番で体験するから、不正なく安心して楽しめます。
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.title}
                className="flex flex-col gap-3 rounded-2xl border border-ringo-purple/30 bg-ringo-bg/60 p-5 text-sm leading-relaxed"
              >
                <p className="text-base font-semibold text-ringo-red">{step.title}</p>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="flex flex-col items-center gap-4 rounded-3xl bg-white/70 px-6 py-8 text-sm text-ringo-ink/70 shadow-ringo-card md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} りんご会♪ All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="transition hover:text-ringo-red">
              利用規約
            </Link>
            <Link href="/privacy" className="transition hover:text-ringo-red">
              プライバシーポリシー
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
