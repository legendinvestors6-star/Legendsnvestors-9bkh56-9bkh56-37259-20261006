import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const navigate = useNavigate();
  
  useEffect(() => {
    try {
      const stored = localStorage.getItem('adidas_user') || localStorage.getItem('user') || localStorage.getItem('currentUser');
      const user = stored ? JSON.parse(stored) : null;
      if (user) {
        navigate(user.isAdmin ? '/admin' : '/home');
      } else {
        navigate('/login');
      }
    } catch (e) {
      console.error(e);
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div style={{ background: 'white', minHeight: '100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{textAlign:'center'}}>
        <p style={{fontSize:'24px', fontWeight:'900', color:'#d4af37'}}>LEGEND</p>
        <p style={{color:'black', marginTop:'10px'}}>Loading... Redirecting to login</p>
      </div>
    </div>
  );
}
