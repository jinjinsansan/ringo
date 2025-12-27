export default function PrivacyPage() {
  const sections = [
    {
      title: "1. 収集する情報",
      content:
        "メールアドレス、Amazon欲しいものリストのURL、購入スクリーンショット、紹介コード情報など、サービス運営に必要な範囲の情報を取得します。",
    },
    {
      title: "2. 利用目的",
      content:
        "本人確認、りんご抽選・購入検証、問い合わせ対応、サービス改善、利用状況の統計分析に利用します。",
    },
    {
      title: "3. 第三者提供",
      content:
        "法令で認められる場合やユーザーの同意がある場合を除き、第三者へ提供することはありません。",
    },
    {
      title: "4. 外部サービス",
      content:
        "Supabase（認証・DB）や OpenAI（OCR/チャット）など外部サービスを使用します。各サービスの規約も合わせてご確認ください。",
    },
    {
      title: "5. 安全管理",
      content:
        "通信の暗号化やアクセス権限の管理など、適切な安全対策を講じて情報を保護します。",
    },
    {
      title: "6. ユーザーの権利",
      content:
        "ご自身の情報の開示・訂正・削除・利用停止を希望される場合は、お問い合わせフォームよりご連絡ください。",
    },
    {
      title: "7. クッキー等",
      content:
        "ログイン状態の維持や分析のためにクッキーや同等の技術を用います。ブラウザ設定で無効化できますが、一部機能が制限されることがあります。",
    },
    {
      title: "8. 改定",
      content:
        "必要に応じて本ポリシーを改定することがあります。重大な変更はサイト上でお知らせします。",
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10 text-ringo-ink">
      <header className="space-y-2 text-center">
        <p className="text-sm font-semibold text-ringo-red">PRIVACY POLICY</p>
        <h1 className="font-logo text-4xl font-bold">プライバシーポリシー</h1>
        <p className="text-sm text-ringo-ink/70">最終更新日: 2025年1月15日</p>
      </header>

      <section className="space-y-6 rounded-3xl border border-ringo-purple/20 bg-white/90 p-6 text-sm leading-relaxed shadow-ringo-card">
        <p>
          りんご会♪（以下「本サービス」）は、ユーザーの個人情報を適切に取り扱うため、以下のプライバシーポリシーを定めます。
        </p>
        <div className="space-y-5">
          {sections.map((section) => (
            <article key={section.title} className="space-y-2">
              <h2 className="text-base font-semibold text-ringo-red">{section.title}</h2>
              <p className="text-ringo-ink/80">{section.content}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-ringo-purple/20 bg-ringo-bg/80 p-6 text-sm shadow-ringo-card">
        <h2 className="text-base font-semibold text-ringo-red">お問い合わせ</h2>
        <p className="mt-2 text-ringo-ink/80">
          個人情報の取り扱いに関するご相談は、アプリ内のお問い合わせフォームまたは support@ringo-kai.example までご連絡ください。
        </p>
      </section>
    </main>
  );
}
