const chatBody = document.querySelector(".chat-body");
const SendMessageButton = document.querySelector("#send-message");
const messageInput = document.querySelector(".message-input");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

const userData = {
  message: null
};

const initialInputHeight = messageInput.scrollHeight;

const recomendaciones = {
  triste: {
    genero: 'Sentimental',
    canciones: ['I Bet on Losing Dogs - Mitski', 'Like Him - Tyler the Creator', 'Car Accident - Sewerslvt']
  },
  feliz: {
    genero: 'Pop alegre',
    canciones: ['Ballon - Tyler the Creator ', 'Labyrinth - Miracle Musical', 'Variations on a Cloud - Miracle Musical']
  },
  emocionado: {
    genero: 'Motivacional',
    canciones: ['Looming.Sorrow.Descent - Sewerslvt', 'White Ball - Miracle Musical', 'Happy - Mitski']
  },
  relajado: {
    genero: 'Ambient / Clásica',
    canciones: ['Dream Sweet In Sea Major - Miracle Musical', 'Stranded Lullaby', 'SIsle Into Thyself - Miracle Musical']
  }
};




const createMessageElement = (content, classes) => {
  const div = document.createElement("div");
  div.classList.add("message", classes);
  div.innerHTML = content;
  return div;
};

const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  if (!userData.message) return;
  messageInput.value = "";

  const messageContent = `<div class="message-text"></div>`;
  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  outgoingMessageDiv.querySelector(".message-text").innerText = userData.message;
  chatBody.appendChild(outgoingMessageDiv);

  // Mostrar animación "pensando"
  const thinking = `
    <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" viewBox="0 0 16 16">
      <path d="..."/> 
    </svg>
    <div class="message-text">
      <div class="thinking-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>`;

  const incomingMessageDiv = createMessageElement(thinking, "bot-message");
  chatBody.appendChild(incomingMessageDiv);

  // Mostrar respuesta del bot después de 800ms
  setTimeout(() => {
    chatBody.removeChild(incomingMessageDiv); // quitar animación
    handleBotResponse(userData.message.toLowerCase());
  }, 800);
};

const handleBotResponse = (input) => {
  const mood = ['triste', 'feliz', 'emocionado', 'relajado'].find(e => input.includes(e));
  let botText = "No entendí tu estado de ánimo. Por favor escribe: triste, feliz, emocionado o relajado.";

  if (mood && recomendaciones[mood]) {
    const reco = recomendaciones[mood];
    botText = `
    ¡Te recomiendo escuchar algo del género <strong><span style="color: #39aca6;">${reco.genero}</span></strong>!<br>
    Algunas canciones que podrían gustarte:<br>
    <ul>${reco.canciones.map(c => `<li>${c}</li>`).join('')}</ul>
  `;
  }

  const mensajeBotHTML = crearMensajeBot(botText);
  chatBody.insertAdjacentHTML('beforeend', mensajeBotHTML);
};

messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});


messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && userMessage && !e.shiftkey && window.innerWidth > 768) handleOutgoingMessage(e);
});

function crearMensajeBot(mensajeHTML) {
  return `
    <div class="message bot-message">
      <svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" fill="currentColor" viewBox="0 0 16 16">
        <path d="M6 12.5a.5.5 0 0 1-.5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM8 1a1 1 0 0 1 1 1v1.5h1A2.5 2.5 0 0 1 12.5 6V7h.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 3 7h.5V6A2.5 2.5 0 0 1 6 3.5h1V2a1 1 0 0 1 1-1Zm-4 6.5a.5.5 0 0 0-.5.5v1h9v-1a.5.5 0 0 0-.5-.5H4Z"/>
      </svg>
      <div class="message-text">${mensajeHTML}</div>
    </div>
  `;
}
// ✅ Botón "Enviar"
SendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e));

// ✅ Botones de emoción
['triste', 'feliz', 'emocionado', 'relajado'].forEach(emocion => {
  document.getElementById(emocion).addEventListener('click', () => {
    const userMessage = `Me siento ${emocion}`;
    const messageContent = `<div class="message-text">${userMessage}</div>`;
    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    chatBody.appendChild(outgoingMessageDiv);

    // Animación "pensando"
    const thinking = `<div class="message-text"><div class="thinking-indicator"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>`;
    const thinkingDiv = createMessageElement(thinking, "bot-message");
    chatBody.appendChild(thinkingDiv);

    setTimeout(() => {
      chatBody.removeChild(thinkingDiv);
      handleBotResponse(emocion);
    }, 800);
  });
});

const picker = new EmojiMart.Picker({
  theme: "light",
  skinTonePosition: "none",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker") {
      document.body.classList.toggle("show-emoji-picker");
    } else {
      document.body.classList.remove("show-emoji-picker");
    }
  }
});

document.querySelector(".chat-form").appendChild(picker);
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));