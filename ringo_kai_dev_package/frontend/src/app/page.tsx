import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-body text-ringo-ink overflow-x-hidden">
      {/* Header */}
      <header className="py-4 px-6 flex justify-between items-center bg-white/60 backdrop-blur-md sticky top-0 z-50 border-b border-ringo-pink-soft/50 shadow-sm">
        <h1 className="text-2xl font-bold font-logo text-ringo-rose tracking-tight flex items-center gap-1">
          りんご会<span className="text-ringo-red text-3xl leading-none pt-1">♪</span>
        </h1>
        <Link
          href="/login"
          className="text-ringo-rose font-bold hover:text-ringo-red transition-colors font-logo text-sm sm:text-base border-b-2 border-transparent hover:border-ringo-red pb-0.5"
        >
          ログイン
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-grow flex flex-col items-center">
        <section className="w-full max-w-5xl px-6 py-12 md:py-20 flex flex-col md:flex-row items-center justify-center text-center md:text-left gap-8 md:gap-16">
          <div className="flex-1 flex flex-col items-center md:items-start gap-6 z-10">
            <div className="inline-block bg-white/80 px-5 py-2 rounded-full text-ringo-red font-bold text-sm shadow-sm border border-ringo-pink-soft animate-bounce">
              ✨ 欲しいものリスト交換コミュニティ
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold font-logo leading-tight text-ringo-ink drop-shadow-sm">
              あなたの<br className="md:hidden" />
              <span className="text-ringo-rose">欲しい</span>が<br />
              誰かの<span className="text-ringo-red">贈り物</span>に。
            </h2>
            <p className="text-lg text-gray-600 max-w-md leading-relaxed">
              りんご会は、Amazonの欲しいものリストを交換し合う、
              ちょっとドキドキするゲーム感覚のコミュニティです。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4">
              <Link href="/register" className="btn-primary w-full sm:w-auto shadow-lg hover:shadow-xl">
                今すぐはじめる
              </Link>
              <Link href="/login" className="btn-secondary w-full sm:w-auto text-center">
                ログイン
              </Link>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center relative w-full max-w-[400px]">
             <div className="relative w-72 h-72 md:w-96 md:h-96">
                <div className="absolute inset-0 bg-gradient-to-tr from-ringo-pink-soft to-ringo-purple rounded-full opacity-60 blur-3xl animate-pulse"></div>
                <div className="absolute inset-4 bg-white/40 rounded-full blur-2xl"></div>
                <Image
                  src="/images/character/ringo_kai_main_character.png"
                  alt="りんご会メインキャラクター"
                  fill
                  className="object-contain drop-shadow-2xl relative z-10 hover:scale-105 transition-transform duration-500 ease-in-out"
                  priority
                />
             </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="w-full bg-white/50 py-20 px-6 relative overflow-hidden">
          {/* Decorative background circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-ringo-pink-soft/30 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-ringo-purple/30 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

          <div className="max-w-5xl mx-auto relative z-10">
             <div className="text-center mb-16">
               <span className="text-ringo-rose font-bold tracking-wider uppercase text-sm">How it works</span>
               <h3 className="text-3xl md:text-4xl font-bold font-logo text-ringo-ink mt-2">
                 3ステップで楽しむ<span className="text-ringo-red">♪</span>
               </h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                {/* Step 1 */}
                <div className="group flex flex-col items-center text-center p-8 bg-white/80 backdrop-blur-sm rounded-[2.5rem] shadow-sm border border-ringo-pink-soft hover:shadow-ringo-card hover:-translate-y-2 transition-all duration-300">
                   <div className="w-20 h-20 bg-gradient-to-br from-ringo-pink-soft to-white rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:scale-110 transition-transform">
                     🎁
                   </div>
                   <h4 className="text-xl font-bold font-logo mb-3 text-ringo-rose">誰かに贈る</h4>
                   <p className="text-gray-600 leading-relaxed">
                     まずは誰かの欲しいものリストから、素敵なギフトを贈りましょう。
                     <br/><span className="text-xs text-gray-400 mt-2 block">（3,000円〜4,000円程度）</span>
                   </p>
                </div>

                {/* Step 2 */}
                <div className="group flex flex-col items-center text-center p-8 bg-white/80 backdrop-blur-sm rounded-[2.5rem] shadow-sm border border-ringo-pink-soft hover:shadow-ringo-card hover:-translate-y-2 transition-all duration-300">
                   <div className="w-20 h-20 bg-gradient-to-br from-ringo-purple to-white rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:scale-110 transition-transform">
                     📸
                   </div>
                   <h4 className="text-xl font-bold font-logo mb-3 text-ringo-poison">報告する</h4>
                   <p className="text-gray-600 leading-relaxed">
                     購入したスクリーンショットをアップロードして、承認を待ちます。
                     <br/><span className="text-xs text-gray-400 mt-2 block">（簡単アップロード！）</span>
                   </p>
                </div>

                {/* Step 3 */}
                <div className="group flex flex-col items-center text-center p-8 bg-white/80 backdrop-blur-sm rounded-[2.5rem] shadow-sm border border-ringo-pink-soft hover:shadow-ringo-card hover:-translate-y-2 transition-all duration-300">
                   <div className="w-20 h-20 bg-gradient-to-br from-ringo-red to-ringo-rose rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-lg shadow-ringo-red/30 group-hover:scale-110 transition-transform">
                     🍎
                   </div>
                   <h4 className="text-xl font-bold font-logo mb-3 text-ringo-red">りんごを引く</h4>
                   <p className="text-gray-600 leading-relaxed">
                     承認されたら、りんごを引いてあなたのリストも誰かに届くかも？
                     <br/><span className="text-xs text-gray-400 mt-2 block">（24時間のドキドキ体験）</span>
                   </p>
                </div>
             </div>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="py-20 px-6 max-w-4xl mx-auto w-full">
            <div className="bg-white/60 backdrop-blur-md rounded-[3rem] p-8 md:p-12 border border-white shadow-lg">
                <h3 className="text-2xl font-bold font-logo text-center mb-8 text-ringo-ink">りんご会のこだわり</h3>
                <ul className="space-y-4">
                    <li className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ringo-green text-white flex items-center justify-center font-bold">✓</span>
                        <div>
                            <h4 className="font-bold text-lg text-ringo-ink">完全匿名で安心</h4>
                            <p className="text-gray-600 text-sm">住所や本名を明かすことなく、Amazonの仕組みを使って安全にやり取りできます。</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ringo-gold text-white flex items-center justify-center font-bold">✓</span>
                        <div>
                            <h4 className="font-bold text-lg text-ringo-ink">公平なシステム</h4>
                            <p className="text-gray-600 text-sm">独自のRTP（還元率）システムにより、購入と獲得のバランスを自動調整。ズルはできません！</p>
                        </div>
                    </li>
                    <li className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-ringo-rose text-white flex items-center justify-center font-bold">✓</span>
                        <div>
                            <h4 className="font-bold text-lg text-ringo-ink">友達紹介で確率アップ</h4>
                            <p className="text-gray-600 text-sm">お友達を招待すると、レアなりんご（購入免除権）が当たりやすくなります。</p>
                        </div>
                    </li>
                </ul>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-500 bg-white/40 backdrop-blur-md border-t border-ringo-pink-soft/50">
        <div className="flex flex-col items-center gap-4">
            <div className="flex gap-6 font-medium text-ringo-rose">
                <Link href="/terms" className="hover:text-ringo-red transition-colors">利用規約</Link>
                <Link href="/privacy" className="hover:text-ringo-red transition-colors">プライバシーポリシー</Link>
            </div>
            <p>&copy; {new Date().getFullYear()} Ringokai. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
