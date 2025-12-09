// Loading screen component

import React from 'react';

export const GameLoadingScreen: React.FC = () => {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes game-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
      <div style={{ 
        padding: "20px",
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        color: "white",
        boxSizing: "border-box"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: "50px", 
            height: "50px", 
            border: "3px solid #ffc107", 
            borderTop: "3px solid transparent", 
            borderRadius: "50%", 
            animation: "game-spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    </>
  );
};

