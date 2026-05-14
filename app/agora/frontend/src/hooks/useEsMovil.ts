import { useEffect, useState } from "react";

const useEsMovil = () => {
  const [esMovil, setEsMovil] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setEsMovil(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return esMovil;
};

export default useEsMovil;
