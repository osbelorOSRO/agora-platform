import React from "react";
import Lottie from "lottie-react";
import chatAnimation from "../assets/Chat.json";

export default function ChatAnimation() {
  return (
    <div style={{
      width: "280px",
      maxWidth: "80vw",
      margin: "0 auto"
    }}>
      <Lottie
        animationData={chatAnimation}
        loop={true}
        autoplay={true}
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
}
