import React from "react";
import Lottie from "lottie-react";
import backgroundAnimation from "../assets/background-animation.json";

export default function BackgroundAnimation() {
  return (
    <div className="background-animation">
      <Lottie
        animationData={backgroundAnimation}
        loop={true}
        autoplay={true}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
