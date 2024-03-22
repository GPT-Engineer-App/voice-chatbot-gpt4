import React, { useState, useEffect, useRef } from "react";
import { Box, Flex, Heading, Input, Button, Text, IconButton, Spinner, Avatar, useToast } from "@chakra-ui/react";
import { FaMicrophone, FaStopCircle, FaPaperPlane } from "react-icons/fa";

const Index = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  const handleSendMessage = async () => {
    if (inputText.trim() !== "") {
      const newMessage = { text: inputText, isUser: true };
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInputText("");
      setIsLoading(true);

      try {
        const response = await fetch("/api/chatbot", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: inputText }),
        });

        if (!response.ok) {
          throw new Error("Something went wrong!");
        }

        const data = response.body;
        if (!data) {
          return;
        }

        const reader = data.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let assistantMessage = "";

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value);
          assistantMessage += chunkValue;
          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1];
            if (lastMessage && !lastMessage.isUser) {
              return prevMessages.map((msg, idx) => (idx === prevMessages.length - 1 ? { ...msg, text: assistantMessage } : msg));
            } else {
              return [...prevMessages, { text: assistantMessage, isUser: false }];
            }
          });
        }

        await speak(assistantMessage);
      } catch (error) {
        toast({
          title: "Error",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }

      setIsLoading(false);
    }
  };

  const speak = async (text) => {
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
    utterance.onend = () => {
      setIsSpeaking(false);
    };
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    setIsListening(true);
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      stopListening();
      handleSendMessage();
    };

    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
    window.webkitSpeechRecognition.abort();
  };

  return (
    <Flex direction="column" h="100vh">
      <Flex as="header" align="center" justify="space-between" p={4} bg="teal.500" color="white">
        <Heading size="lg">Chatbot</Heading>
        <Avatar name="Bot" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w1MDcxMzJ8MHwxfHNlYXJjaHwxfHxjaGF0Ym90JTIwYXZhdGFyfGVufDB8fHx8MTcxMTA5NjQ0NHww&ixlib=rb-4.0.3&q=80&w=1080" />
      </Flex>
      <Flex
        flex={1}
        direction="column"
        p={4}
        overflowY="auto"
        sx={{
          "&::-webkit-scrollbar": {
            width: "4px",
          },
          "&::-webkit-scrollbar-track": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "gray.300",
            borderRadius: "24px",
          },
        }}
      >
        {messages.map((message, index) => (
          <Flex key={index} align={message.isUser ? "flex-end" : "flex-start"} mb={4}>
            <Box bg={message.isUser ? "blue.500" : "gray.100"} color={message.isUser ? "white" : "black"} px={3} py={2} borderRadius="lg" maxW="75%">
              <Text>{message.text}</Text>
            </Box>
          </Flex>
        ))}
        {isLoading && (
          <Flex align="center" justify="center" mt={4}>
            <Spinner size="xl" />
          </Flex>
        )}
        <div ref={chatEndRef}></div>
      </Flex>
      <Flex as="footer" p={4} bg="gray.100">
        <Input flex={1} mr={4} value={inputText} onChange={handleInputChange} placeholder="Type your message..." disabled={isListening || isSpeaking} />
        <IconButton aria-label="Speak" icon={isListening ? <FaStopCircle /> : <FaMicrophone />} onClick={handleMicClick} disabled={isSpeaking} />
        <IconButton ml={2} aria-label="Send" icon={<FaPaperPlane />} onClick={handleSendMessage} disabled={isListening || isSpeaking || isLoading} />
      </Flex>
    </Flex>
  );
};

export default Index;
