const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chat-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");

//API key
const API_KEY = "AIzaSyDIZcqtvcaH5WQvh1CtJyAfCr0lhA7XG_M";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;


let tyingInterval, controller;
const chatHistory = [];
const userData = { message: "", file: {} };

//function to create message 
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

//auto scrollll
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const words = text.split(" ");
    let wordIndex = 0;

    tyingInterval = setInterval(() => {
        if (wordIndex < words.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];

            scrollToBottom();
        } else {
            clearInterval(tyingInterval);
            document.body.classList.remove("bot-responding");
            botMsgDiv.classList.remove("loading");

        }
    }, 40);
}

//api call karega chat generate text and file also  ko response
const generateResponse = async(botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");
    controller = new AbortController();

    //send the chat history to the API to get a response
    chatHistory.push({
        role: "user",
        parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
    });
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ contents: chatHistory }),
            signal: controller.signal
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message)

        //process the response text and display it
        const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();
        typingEffect(responseText, textElement, botMsgDiv);
        chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    } catch (error) {
        textElement.style.color = "#d62939";
        textElement.textContent = error.name === "AbortError" ?
            "Response generation stopped." :
            error.message;
    } finally {
        // cleanup always runs whether success, abort, or error
        document.body.classList.remove("bot-responding");
        botMsgDiv.classList.remove("loading");
        userData.file = {};
    }


}

// handle the form submission
const handleFormSubmit = (e) => {
        e.preventDefault();
        const userMessage = promptInput.value.trim();
        if (!userMessage || document.body.classList.contains("bot-responding")) return;


        promptInput.value = "";
        userData.message = userMessage;
        document.body.classList.add("bot-responding", "chats-active");
        fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");

        //isse sida msg genrate hoga html me nah ke console me
        const userMsgHTML = `
    <p class="message-text"></p>
    ${
        userData.file?.data 
            ? (userData.file.isImage 
                ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="image-attachment" />` 
                : `<p class="file-attachment"><span class="material-symbols-rounded">description</span> ${userData.file.fileName}</p>`) : "" }`;

    const userMsgDiv = createMsgElement(userMsgHTML, "user-massage");

    userMsgDiv.querySelector(".message-text").textContent = userMessage
    chatsContainer.appendChild(userMsgDiv);
    scrollToBottom();

    setTimeout(() => {
        //isse sida bot msg genrate hoga html me nah ke console me
        const botMsgHTML = '<img src="assist/gemini-chatbot-logo.svg" alt="" class="avtar"><p class="message-text">Just a sec..</p>';
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-massage", "loading");
        chatsContainer.appendChild(botMsgDiv);
        scrollToBottom();
        generateResponse(botMsgDiv);
    }, 600);
};

//handle file input change(file upload ho sakta hai abh console me)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        fileInput.value = "";
        const base64String = e.target.result.split(",")[1];
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        //store data file data in userData obj
        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
    }
});

// cancel file upload
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

// stop ongoing bot response
document.querySelector("#stop-response-button").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(tyingInterval);
     document.body.classList.remove("bot-responding");
    chatsContainer.querySelector(".bot-massage.loading").classList.remove("loading");
});

// Dellete all chats
document.querySelector("#delete-chat-btn").addEventListener("click", () => {
   chatHistory.length = 0;
   chatsContainer.innerHTML = "";
   document.body.classList.remove("bot-responding", "chats-active");
});

// handle suggestion click
document.querySelectorAll(".sugestionsitem").forEach(item => {
    item.addEventListener("click", () => {
        promptInput.value = item.querySelector(".text").textContent;
        promptForm.dispatchEvent(new Event("submit"));
    });
});

// show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-warpper"); // should be singular (first match)
    if (!wrapper) return; // prevent errors if wrapper is missing

    const shouldHide =
        target.classList.contains("prompt-input") ||
        (wrapper.classList.contains("hide-controls") &&
            (target.id === "add-file-btn" || target.id === "stop-response-button"));

    wrapper.classList.toggle("hide-controls", shouldHide);
});




// toggle dark/light theme
themeToggle.addEventListener("click", () => {
     const islighttheme = document.body.classList.toggle("light-theme");
     localStorage.setItem("themeColor" , islighttheme ? "light_mode" : "dark_mode");
     themeToggle.textContent = islighttheme ? "dark_mode" : "light_mode";
    });
    //   set initial theme from local storage
     const islighttheme =localStorage.getItem("themeColor") === "light_mode";
     document.body.classList.toggle("light-theme", islighttheme);
          themeToggle.textContent = islighttheme ? "dark_mode" : "light_mode";


promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());