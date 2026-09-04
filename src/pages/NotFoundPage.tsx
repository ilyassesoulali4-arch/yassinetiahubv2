import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="container container--narrow page-pad" style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.2rem' }}>الصفحة غير موجودة</h1>
      <p className="lede" style={{ margin: '12px auto 24px' }}>
        ربما تمّ نقل الصفحة أو أنّ الرابط غير صحيح.
      </p>
      <Link to="/">
        <Button>العودة إلى الرئيسية</Button>
      </Link>
    </div>
  );
}
