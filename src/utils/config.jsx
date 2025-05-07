import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client } from "@aws-sdk/client-s3";
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import React from "react";
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";

import SupportPromptGroup from "@cloudscape-design/chat-components/support-prompt-group";
import CodeView from "@cloudscape-design/code-view/code-view";
import typescriptHighlight from "@cloudscape-design/code-view/highlight/typescript";
import Box from "@cloudscape-design/components/box";
import CopyToClipboard from "@cloudscape-design/components/copy-to-clipboard";
import ExpandableSection from "@cloudscape-design/components/expandable-section";
// import { FileTokenGroupProps } from "@cloudscape-design/components/file-token-group";
import Link from "@cloudscape-design/components/link";
import Popover from "@cloudscape-design/components/popover";
import SpaceBetween from "@cloudscape-design/components/space-between";
import TextContent from "@cloudscape-design/components/text-content";

const REGION = "us-east-1";
const IDENTITY_POOL_ID = "us-east-1:68a3cf92-3cad-4475-8c9c-962c996ec84e";

export const supportPromptItems = [
  {
    text: "What else can I do with TypeScript?",
    id: "typescript",
  },
  {
    text: "How would I add parameters and type checking to this function?",
    id: "expand",
  },
];

export const responseList = (
  <TextContent>
    <ol>
      <li>
        To see how an incoming response from generative AI is displayed, ask
        "Show a loading state example".
      </li>
      <li>
        To see an error alert that appears when something goes wrong, ask "Show
        an error state example".
      </li>
      <li>
        To see a how a file upload is displayed, upload one or more files.
      </li>
      <li>To see support prompts, ask "Show support prompts".</li>
    </ol>
  </TextContent>
);

// added as function so that timestamp is evaluated when function is called
export const getInvalidPromptResponse = () => ({
  type: "chat-bubble",
  authorId: "gen-ai",
  content: (
    <>
      The interactions and functionality of this demo are limited.
      {responseList}
    </>
  ),
  timestamp: new Date().toLocaleTimeString(),
  actions: "feedback",
  contentToCopy: `The interactions and functionality of this demo are limited.
 1. To see how an incoming response from generative AI is displayed, ask "Show a loading state example".
 2. To see an error alert that appears when something goes wrong, ask "Show an error state example".
 3. To see a how a file upload is displayed, upload one or more files.
 4. To see support prompts, ask "Show support prompts".`,
});

export const getLoadingMessage = () => ({
  type: "chat-bubble",
  authorId: "gen-ai",
  content: <Box color="text-status-inactive">Searching productions....</Box>,
  timestamp: new Date().toLocaleTimeString(),
  avatarLoading: true,
});

// const getFileResponseMessage = () => ({
//   type: "chat-bubble",
//   authorId: "gen-ai",
//   content:
//     "I see you have uploaded one or more files. I cannot parse the files right now, but you can see what uploaded files look like.",
//   timestamp: new Date().toLocaleTimeString(),
//   avatarLoading: false,
//   actions: "feedback",
//   contentToCopy:
//     "I see you have uploaded one or more files. I cannot parse the files right now, but you can see what uploaded files look like.",
// });

const getLoadingStateResponseMessage = () => ({
  type: "chat-bubble",
  authorId: "gen-ai",
  content:
    'That was the loading state. To see the loading state again, ask "Show a loading state example".',
  timestamp: new Date().toLocaleTimeString(),
  avatarLoading: false,
  actions: "feedback",
  contentToCopy:
    'That was the loading state. To see the loading state again, ask "Show a loading state example".',
});

const getErrorStateResponseMessage = (error) => ({
  type: "alert",
  header: "Error",
  content: (
    <SpaceBetween size="s">
      <span>
        {error}
      </span>
      
    </SpaceBetween>
  ),
});

const getSupportPromptResponseMessage = (onSupportPromptClick) => ({
  type: "chat-bubble",
  authorId: "gen-ai",
  content: (
    <CodeView
      content={`// This is the main function that will be executed when the script runs
function main(): void {
// Use console.log to print "Hello, World!" to the console
console.log("Hello, World!");
}
// Call the main function to execute the program
main();`}
      highlight={typescriptHighlight}
    />
  ),
  actions: "code-view",
  contentToCopy: `// This is the main function that will be executed when the script runs
function main(): void {
  // Use console.log to print "Hello, World!" to the console
  console.log("Hello, World!");
}
// Call the main function to execute the program
main();`,
  timestamp: new Date().toLocaleTimeString(),
  supportPrompts: (
    <SupportPromptGroup
      ariaLabel="Proposed prompts"
      items={supportPromptItems}
      onItemClick={({ detail }) => {
        onSupportPromptClick?.(detail);
      }}
    />
  ),
});

const extractImageUrl = (content) => {
  const pattern = /s3:\/\/[^\s"']+\.jpg/g;
  return content.match(pattern) || [];
};

function extractRationale(traceData) {
  const rationale = [];

  // Process trace data to extract reasoning steps
  if (traceData?.trace?.orchestrationTrace) {
    // Extract thought process from orchestration trace
    const orchTrace = traceData.trace.orchestrationTrace;
    console.log("Orchestration Trace:", orchTrace);

    // Extract thought process from rationale
    if (orchTrace.rationale) {
      // Extract rationale text
      const rationaleText = orchTrace.rationale.text ?? "";
      console.log("Rationale Text:", rationaleText);
      if (rationaleText) {
        rationale.push({
          type: "thinking",
          content: rationaleText,
        });
      }
    }

    // Extract action information
    if (orchTrace.action) {
      const action = orchTrace.action;
      rationale.push({
        type: "action",
        content: `Action: ${action.type ?? "Unknown"}`,
      });

      // Extract details based on action type
      if (action.type === "KNOWLEDGE_BASE_LOOKUP") {
        const kbParams =
          action.knowledgeBaseLookup?.knowledgeBaseQueryParams ?? {};
        rationale.push({
          type: "action_detail",
          content: `Searching knowledge base with: ${kbParams.text ?? "N/A"}`,
        });
      }
    }

    // Extract observation information
    if (orchTrace.observation) {
      const obs = orchTrace.observation;
      if (obs.knowledgeBaseLookupOutput) {
        const kbOutput = obs.knowledgeBaseLookupOutput;
        if (
          kbOutput.retrievedReferences &&
          kbOutput.retrievedReferences.length > 0
        ) {
          const refs = kbOutput.retrievedReferences;
          rationale.push({
            type: "observation",
            content: `Found ${refs.length} relevant document(s)`,
          });
        }
      }
    }
  }

  return rationale;
}

const invokeBedrockAgent = async (prompt, sessionId) => {
  const client = new BedrockAgentRuntimeClient({
    region: "us-east-1",
    // credentials: {
    //   accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    //   secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    // },
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: REGION }, // Configure the underlying CognitoIdentityClient.
      identityPoolId: IDENTITY_POOL_ID,
    })
  });
  const agentId = "XHOPKHZTS1";
  const agentAliasId = "D4GSGFIMFW";

  const command = new InvokeAgentCommand({
    agentId,
    agentAliasId,
    sessionId,
    inputText: prompt,
  });

  try {
    let completion = "";
    let processed_text = "";
    const response = await client.send(command);

    if (response.completion === undefined) {
      throw new Error("Completion is undefined");
    }

    for await (const chunkEvent of response.completion) {
      if (Object.hasOwn(chunkEvent, "chunk")) {
        const chunk = chunkEvent.chunk;
        const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
        completion += decodedResponse;
        console.log("chunk ", chunk);
      } else if (Object.hasOwn(chunkEvent, "trace")) {
        const trace = chunkEvent.trace;
        const rationale_items = extractRationale(trace);
        console.log("Rationale Items: ", rationale_items);
        return { type: "rationable", sessionId: sessionId, rationale_items };
      }
    }

    return { type: "chunk", sessionId: sessionId, completion };
  } catch (err) {
    console.error(err);
  }
};
const getImageFromS3 = async (url) => {
  const client = new S3Client({
    region: "us-east-1",
    // credentials: {
    //   accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    //   secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    // },
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: REGION }, // Configure the underlying CognitoIdentityClient.
      identityPoolId: IDENTITY_POOL_ID,
    })
  });
  const path_parts = url.replace("s3://", "").split("/");
  const bucket = path_parts[0];
  const key = path_parts.slice(1).join("/");

  const params = {
    Bucket: bucket,
    Key: key,
  };
  const command = new GetObjectCommand(params);
  // const response = await client.send(command);
  const response = await getSignedUrl(client, command, {});
  return response;
};

const getImages = async (response) => {
  const imageUrls = extractImageUrl(response);
  let preSignedUrls = [];
  for (const imageUrl of imageUrls) {
    const image = await getImageFromS3(imageUrl);

    preSignedUrls.push(image);
  }

  return preSignedUrls;
};

export const getAgentResponse = async (prompt) => {
  let messages = "";
  try {
    const sessionId = "session-01245";
    const response = await invokeBedrockAgent(prompt, sessionId);
    messages = response.completion;
    console.log("Response: ", messages);

    const images = await getImages(messages);
    let imageIndex = 0;
    const textWithBreaks = messages.split("\n").map((text, index) => {
      const imagePosition = text.includes("Vị trí ảnh:")
        ? messages.indexOf("Vị trí ảnh:") + 11
        : -1;
      if (imagePosition > 0) {
        imageIndex++;
        return (
          <div key={index}>
            {text}
            <br />
            <img style={{maxHeight: "200px"}} src={images[imageIndex - 1]} />
            <br />
          </div>
        );
      } else {
        return (
          <div key={index}>
            {text}
            <br />
          </div>
        );
      }
    });
    const aiResponse = {
      type: "chat-bubble",
      authorId: "gen-ai",
      content: <>{textWithBreaks}</>,
    };
    console.log("aiResponse: ", aiResponse);
    return aiResponse;
  } catch (error) {
    console.error("Error invoking Bedrock agent:", error);
    return getErrorStateResponseMessage(error);
  }
};
export const validLoadingPrompts = [
  "show a loading state example",
  "loading state",
  "loading",
];

export const VALID_PROMPTS = [
  {
    prompt: validLoadingPrompts,
    getResponse: getLoadingStateResponseMessage,
  },
  {
    prompt: ["show an error state example", "error state", "error"],
    getResponse: getErrorStateResponseMessage,
  },
  // {
  //   prompt: ["file"],
  //   getResponse: getFileResponseMessage,
  // },
  {
    prompt: ["show support prompts", "support prompts", "support prompt"],
    getResponse: (onSupportPromptClick) =>
      getSupportPromptResponseMessage(onSupportPromptClick),
  },
];

// Needed only for the existing messages upon page load.
function getTimestampMinutesAgo(minutesAgo) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesAgo);

  return d.toLocaleTimeString();
}

export const AUTHORS = {
  "user-jane-doe": { type: "user", name: "Jane Doe", initials: "JD" },
  "gen-ai": { type: "gen-ai", name: "Generative AI assistant" },
};

const CitationPopover = ({ count, href }) => (
  <Box color="text-status-info" display="inline">
    <Popover
      header="Source"
      content={
        <Link href={href} external variant="primary">
          {href}
        </Link>
      }
      position="right"
    >
      [{count}]
    </Popover>
  </Box>
);

export const getInitialMessages = (onSupportPromptClick) => {
  return [
    {
      type: "chat-bubble",
      authorId: "gen-ai",
      content: "Tôi có thể giúp gì cho bạn?",
      timestamp: getTimestampMinutesAgo(9),
      actions: "feedback",
      contentToCopy: "Tôi có thể giúp gì cho bạn?",
    },
  ];
};

export const supportPromptMessageOne = {
  type: "chat-bubble",
  authorId: "gen-ai",
  content: (
    <>
      TypeScript is a powerful programming language that builds upon JavaScript
      by adding static typing and other features. Here are key things you can do
      with TypeScript:
      <ol>
        <li>
          Web developement
          <ul>
            <li>
              Build frontend applications using frameworks like Angular, React,
              or Vue.js
            </li>
            <li>Create robust server-side applications with Node.js</li>
            <li>Develop full-stack applications with enhanced type safety</li>
          </ul>
        </li>

        <li>
          Type safety features
          <ul>
            <li>Define explicit types for variables, functions, and objects</li>
            <li>Catch errors during development before runtime</li>
            <li>
              Use interfaces and type declarations for better code organization
            </li>
          </ul>
        </li>
        <li>
          Object-oriented programming
          <ul>
            <li>Create classes with proper inheritance</li>
            <li>Implement interfaces</li>
            <li>Use access modifiers (public, private, protected)</li>
          </ul>
        </li>
      </ol>
      TypeScript is particularly valuable for large projects where type safety
      and code maintainability are important considerations.
    </>
  ),
  timestamp: new Date().toLocaleTimeString(),
  actions: "feedback",
  contentToCopy: `TypeScript is a powerful programming language that builds upon JavaScript by adding static typing and other features. Here are key things you can do with TypeScript:
1. Web developement
 - Build frontend applications using frameworks like Angular, React, or Vue.js
 - Create robust server-side applications with Node.js
 - Develop full-stack applications with enhanced type safety
2. Type safety features
 - Define explicit types for variables, functions, and objects
 - Catch errors during development before runtime
 - Use interfaces and type declarations for better code organization
3. Object-oriented programming
 - Create classes with proper inheritance
 - Implement interfaces
 - Use access modifiers (public, private, protected)
TypeScript is particularly valuable for large projects where type safety and code maintainability are important considerations.`,
};

export const supportPromptMessageTwo = {
  type: "chat-bubble",
  authorId: "gen-ai",
  content: (
    <CodeView
      highlight={typescriptHighlight}
      content={`// Here's how you might add input parameters and type checking
function enhancedMain(name: string, greeting: string = "Hello"): void {
  if (!name) {
    throw new error('Name parameter is required.');
  }
  console.log(\`\${greeting}, \${name}!\`);
}

// Call the enhancedMain function to execute the program
enhancedMain('Greetings', 'Earth');`}
    />
  ),
  actions: "code-view",
  contentToCopy: `// Add input parameters and type checking
function enhancedMain(name: string, greeting: string = "Hello"): void {
  if (!name) {
   throw new error('Name parameter is required.');
  }
  console.log("{greeting}, {name}!");
}
// Call the enhancedMain function to execute the program
enhancedMain('Greetings', 'Earth');`,
  timestamp: new Date().toLocaleTimeString(),
};

export const fileTokenGroupI18nStrings = {
  removeFileAriaLabel: (index) => `Remove file ${index + 1}`,
  limitShowFewer: "Show fewer files",
  limitShowMore: "Show more files",
  errorIconAriaLabel: "Error",
  warningIconAriaLabel: "Warning",
};
