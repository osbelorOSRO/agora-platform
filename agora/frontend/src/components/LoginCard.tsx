import React from 'react';
import { estilos } from '../theme/estilos';

interface LoginCardProps {
  children: React.ReactNode;
}

const LoginCard = ({ children }: LoginCardProps) => {
  return (
    <div className={estilos.loginCard.contenedor}>
      <div className={estilos.loginCard.card}>
        {children}
      </div>
    </div>
  );
};

export default LoginCard;
