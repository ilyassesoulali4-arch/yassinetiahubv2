export function AboutPage() {
  return (
    <div className="container container--narrow page-pad">
      <h1>حول YassineTia Hub</h1>
      <p className="lede">
        مكان يجتمع فيه متابعو YassineTia Academy لتبادل الأفكار والمساهمات وبناء المحتوى القادم معًا.
      </p>

      <div className="prose">
        <h2>ما الذي يميّز هذا المكان؟</h2>
        <p>
          YassineTia Hub ليس مجرد قناة أحادية. هنا تتحوّل أفكارك من ملاحظة عابرة إلى اقتراح مرئي،
          يمكن للآخرين دعمه، ويمكن لصانع المحتوى التفاعل معه علنيًا.
        </p>

        <h2>كيف يعمل؟</h2>
        <ul>
          <li>قدّم فكرة في الصفحة الرئيسية.</li>
          <li>تصفّح أفكار المجتمع، ناقش، وادعم ما يعجبك.</li>
          <li>تابع حالة فكرتك: قيد المراجعة، مخطّط لها، أو منجَزة.</li>
        </ul>

        <h2>للاستفسارات</h2>
        <p>
          راسلنا عبر صفحة <a href="/contact" style={{ color: 'var(--gold)' }}>التواصل</a>،
          أو تابع القناة على Instagram من الفوتر.
        </p>
      </div>
    </div>
  );
}
