import React, { useEffect, useRef, useState } from "react";

// import { SupportPromptGroupProps } from "@cloudscape-design/chat-components/support-prompt-group";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
import FileDropzone, {
  useFilesDragging,
} from "@cloudscape-design/components/file-dropzone";
import FileInput from "@cloudscape-design/components/file-input";
import FormField from "@cloudscape-design/components/form-field";
import Multiselect from "@cloudscape-design/components/multiselect";
import FileTokenGroup from "@cloudscape-design/components/file-token-group";
import Header from "@cloudscape-design/components/header";
import Icon from "@cloudscape-design/components/icon";
import Link from "@cloudscape-design/components/link";
import PromptInput from "@cloudscape-design/components/prompt-input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Select from "@cloudscape-design/components/select";

// import { isVisualRefresh } from "../../common/apply-mode";
import { FittedContainer, ScrollableContainer } from "../components/Common";
import {
  fileTokenGroupI18nStrings,
  getInitialMessages,
  getInvalidPromptResponse,
  getLoadingMessage,
  responseList,
  supportPromptItems,
  supportPromptMessageOne,
  supportPromptMessageTwo,
  VALID_PROMPTS,
  validLoadingPrompts,
  getAgentResponse,
} from "../utils/config";
import Messages from "./Messages";

import "../styles/chat.scss";

export default function Chat() {
  const waitTimeBeforeLoading = 300;
  // The loading state will be shown for 4 seconds for loading prompt and 1.5 seconds for rest of the prompts
  const waitTimeBeforeResponse = (isLoadingPrompt) =>
    isLoadingPrompt ? 4000 : 1500;

  const [prompt, setPrompt] = useState("");
  const [isGenAiResponseLoading, setIsGenAiResponseLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const messagesContainerRef = useRef(null);
  const [selectedOption, setSelectedOption] = useState({
    label: "",
    value: "",
  });

  //   const [selectedOptions, setSelectedOptions] = useState([
  //     {
  //       label: "Option 1",
  //       value: "1",
  //       description: "This is a description",
  //     },
  //   ]);

  const [files, setFiles] = useState([]);
  const promptInputRef = useRef(null);
  const [messages, setMessages] = useState([]);

  const { areFilesDragging } = useFilesDragging();

  const onSupportPromptClick = (detail) => {
    let newMessage;
    console.log("onSupportPromptClick", detail);

    if (detail.id === "typescript") {
      newMessage = supportPromptMessageOne;
    }

    if (detail.id === "expand") {
      newMessage = supportPromptMessageTwo;
    }

    const supportPromptText = supportPromptItems.find(
      (item) => item.id === detail.id
    )?.text;

    const newUserMessage = {
      type: "chat-bubble",
      authorId: "user-jane-doe",
      content: supportPromptText,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prevMessages) => [...prevMessages, newUserMessage]);

    promptInputRef.current?.focus();

    setTimeout(() => {
      setIsGenAiResponseLoading(true);
      setMessages((prevMessages) => [...prevMessages, getLoadingMessage()]);

      setTimeout(() => {
        setMessages((prevMessages) => {
          prevMessages.splice(prevMessages.length - 1, 1, newMessage);
          return prevMessages;
        });

        setIsGenAiResponseLoading(false);
      }, waitTimeBeforeResponse());
    }, waitTimeBeforeLoading);
  };

  const setShowFeedbackDialog = (index, show) => {
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages];
      const updatedMessage = {
        ...prevMessages[index],
        showFeedbackDialog: show,
      };
      updatedMessages.splice(index, 1, updatedMessage);
      return updatedMessages;
    });
  };

  const lastMessageContent = messages[messages.length - 1]?.content;

  useEffect(() => {
    setMessages(getInitialMessages(onSupportPromptClick));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scroll to the bottom to show the new/latest message
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop =
          messagesContainerRef.current.scrollHeight;
      }
    }, 0);
  }, [lastMessageContent]);

  const onPromptSend = async ({ detail: { value } }) => {
    if (
      (!value && files.length === 0) ||
      (value.length === 0 && files.length === 0) ||
      isGenAiResponseLoading
    ) {
      return;
    }
    
    const newMessage = {
      type: "chat-bubble",
      authorId: "user-jane-doe",
      content: value,
      timestamp: new Date().toLocaleTimeString(),
      files,
    };

    let fileValue = files;

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setPrompt("");
    setFiles([]);

    const size = selectedOption.label ? `, cỡ giày ${selectedOption.value}` : "";
    const lowerCasePrompt = value.toLowerCase().concat(size);

    const isLoadingPrompt = validLoadingPrompts.includes(lowerCasePrompt);

    // Show loading state
    // setTimeout(() => {
    //   setIsGenAiResponseLoading(true);
    //   setMessages((prevMessages) => [...prevMessages, getLoadingMessage()]);

    //   setTimeout(() => {
    //     // const validPrompt =
    //     //   fileValue.length > 0
    //     //     ? VALID_PROMPTS.find(({ prompt }) => prompt.includes("file"))
    //     //     : VALID_PROMPTS.find(({ prompt }) =>
    //     //         prompt.includes(lowerCasePrompt)
    //     //       );

    //     // Send Gen-AI response, replacing the loading chat bubble
    //     const response = getAgentResponse(lowerCasePrompt);
    //     setMessages((prevMessages) => {
    //     //   const response = validPrompt
    //     //     ? validPrompt.getResponse(onSupportPromptClick)
    //     //     : getInvalidPromptResponse();

    //       prevMessages.splice(prevMessages.length - 1, 1, response);
    //       return prevMessages;
    //     });
    //     setIsGenAiResponseLoading(false);
    //     fileValue = [];
    //   }, waitTimeBeforeResponse(isLoadingPrompt));
    // }, waitTimeBeforeLoading);
    setIsGenAiResponseLoading(true);
    setMessages((prevMessages) => [...prevMessages, getLoadingMessage()]);

    // Send Gen-AI response, replacing the loading chat bubble
    try {
      const response = await getAgentResponse(lowerCasePrompt);
      setMessages((prevMessages) => {
        prevMessages.splice(prevMessages.length - 1, 1, response);
        return prevMessages;
      });
      fileValue = [];
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsGenAiResponseLoading(false);
    }
  };

  const addMessage = (index, message) => {
    setMessages((prevMessages) => {
      const updatedMessages = [...prevMessages];
      updatedMessages.splice(index, 0, message);
      return updatedMessages;
    });
  };

  return (
    <div className={`chat-container false`}>
      {/* {showAlert && (
        <Alert
          dismissible
          statusIconAriaLabel="Info"
          onDismiss={() => setShowAlert(false)}
        >
          <ExpandableSection
            variant="inline"
            headerText="This demo showcases how to use generative AI components to build a generative AI chat. The interactions and
          functionality are limited."
          >
            {responseList}
          </ExpandableSection>
        </Alert>
      )} */}

      <FittedContainer>
        <Container
          header={<Header variant="h3">Course Recommendation</Header>}
          fitHeight
          disableContentPaddings
          footer={
            <>
              <PromptInput
                ref={promptInputRef}
                onChange={({ detail }) => setPrompt(detail.value)}
                onAction={onPromptSend}
                value={prompt}
                actionButtonAriaLabel={
                  isGenAiResponseLoading
                    ? "Send message button - suppressed"
                    : "Send message"
                }
                actionButtonIconName="send"
                ariaLabel={
                  isGenAiResponseLoading
                    ? "Prompt input - suppressed"
                    : "Prompt input"
                }
                placeholder="Bạn muốn tìm hiểu về gì?"
                autoFocus
                disableSecondaryActionsPaddings
              />
            </>
          }
        >
          <ScrollableContainer ref={messagesContainerRef}>
            <Messages
              messages={messages}
              setShowFeedbackDialog={setShowFeedbackDialog}
              addMessage={addMessage}
            />
          </ScrollableContainer>
        </Container>
      </FittedContainer>
    </div>
  );
}
