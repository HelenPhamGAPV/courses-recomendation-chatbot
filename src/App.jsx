import { useState } from "react";
import {
  Container,
  Button,
  AppLayoutToolbar,
  AppLayout,
  SideNavigation,
  Flashbar
} from "@cloudscape-design/components";
import "./App.css";
import Chat from "./views/Chat";

function App() {
  const [flashItem, setFlashItem] = useState([]);
  return (
    <AppLayout
      maxContentWidth={1280}
      toolsHide
      navigationHide
      content={<Chat />}
      notifications={
        <Flashbar items={flashItem} />
      }
    ></AppLayout>
  );
}

export default App;
