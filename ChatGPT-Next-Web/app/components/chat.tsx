import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  Fragment,
  RefObject,
} from "react";

import SendWhiteIcon from "../icons/send-white.svg";
import ReturnIcon from "../icons/return.svg";
import MaxIcon from "../icons/max.svg";
import MinIcon from "../icons/min.svg";

import {
  ChatMessage,
  useChatStore,
  BOT_HELLO,
  createMessage,
  useAccessStore,
  useAppConfig,
  DEFAULT_TOPIC,
} from "../store";

import {
  useMobileScreen,
  getMessageTextContent,
  safeLocalStorage,
} from "../utils";

import Locale from "../locales";

import { IconButton } from "./button";
import styles from "./chat.module.scss";

import { useNavigate } from "react-router-dom";
import {
  CHAT_PAGE_SIZE,
  Path,
  REQUEST_TIMEOUT_MS,
  UNFINISHED_INPUT,
} from "../constant";
import { Avatar } from "./emoji";
import { prettyObject } from "../utils/format";
import { getClientConfig } from "../config/client";

import clsx from "clsx";

const localStorage = safeLocalStorage();

// 将聊天框口自动滑动到最底端
function useScrollToBottom(scrollRef: RefObject<HTMLDivElement>, detach: boolean = false,) {
  const [autoScroll, setAutoScroll] = useState(true);
  function scrollDomToBottom() {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        setAutoScroll(true);
        dom.scrollTo(0, dom.scrollHeight);
      });
    }
  }

  // auto scroll
  useEffect(() => {
    if (autoScroll && !detach) {
      scrollDomToBottom();
    }
  });

  return {
    scrollRef,
    autoScroll,
    setAutoScroll,
    scrollDomToBottom,
  };
}

// 主聊天组件，包含聊天消息的渲染、用户输入处理、滚动处理等逻辑。
function _Chat() {
  type RenderMessage = ChatMessage & { preview?: boolean };

  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  const config = useAppConfig();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 检查聊天窗口是否已经滚动到底部
  const isScrolledToBottom = scrollRef?.current
    ? Math.abs(
    scrollRef.current.scrollHeight -
    (scrollRef.current.scrollTop + scrollRef.current.clientHeight),
  ) <= 1 : false;
  // 该值表示聊天窗口的最后一条消息是否接近聊天窗口的顶部
  const isAttachWithTop = useMemo(() => {
    const lastMessage = scrollRef.current?.lastElementChild as HTMLElement;
    // if scrolllRef is not ready or no message, return false
    if (!scrollRef?.current || !lastMessage) return false;
    const topDistance =
      lastMessage!.getBoundingClientRect().top -
      scrollRef.current.getBoundingClientRect().top;
    // leave some space for user question
    return topDistance < 100;
  }, [scrollRef?.current?.scrollHeight]);

  const isTyping = userInput !== "";

  // if user is not typing, should auto scroll to bottom only if already at bottom
  const { setAutoScroll, scrollDomToBottom } =
    useScrollToBottom(scrollRef, (isScrolledToBottom || isAttachWithTop) && !isTyping,);

  const isMobileScreen = useMobileScreen();
  const navigate = useNavigate();

  // 提交后的回调
  const doSubmit = (userInput: string) => {
    if (userInput.trim() === "") return;
    setIsLoading(true);
    // 生成或获取当前用户的唯一标识
    const userId = localStorage.getItem('userId') || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (!localStorage.getItem('userId')) {
      localStorage.setItem('userId', userId); // 如果是第一次，保存到 localStorage
    }
    const userMessage = createMessage({
      role: "user",
      content: userInput,
    });
    chatStore.updateTargetSession(session, (session) => {
      session.messages = session.messages.concat([userMessage]);
    });

    const request = {
      sender: userId,// 唯一标识
      message: userInput,
    }

    // 向指定地址发送 POST 请求
    fetch('http://1.95.55.32:80/react_rq/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',  // 设置请求头，表明请求体是 JSON 格式
      },
      body: JSON.stringify(request),  // 将请求体转换为 JSON 字符串
    })
      .then((response) => response.json())
      .then((data) => {
        // 处理响应数据
        console.log('Response111:', data.content);
        const aiMessage = createMessage({
          role: "assistant",
          content: data.content,
        });
        chatStore.updateTargetSession(session, (session) => {
          session.messages = session.messages.concat([aiMessage]);
        });
        scrollDomToBottom();
      })
      .catch((error) => {
        // 处理错误
        console.error('Error:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });



    setIsLoading(false)

    chatStore.setLastInput(userInput);

    setUserInput("");
    if (!isMobileScreen) inputRef.current?.focus();
    setAutoScroll(true);

  };

  // 当session变化后的回调
  useEffect(() => {
    chatStore.updateTargetSession(session, (session) => {
      const stopTiming = Date.now() - REQUEST_TIMEOUT_MS;
      session.messages.forEach((m) => {
        // check if should stop all stale messages
        if (m.isError || new Date(m.date).getTime() < stopTiming) {
          if (m.streaming) {
            m.streaming = false;
          }

          if (m.content.length === 0) {
            m.isError = true;
            m.content = prettyObject({
              error: true,
              message: "empty response",
            });
          }
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  //
  const onInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "ArrowUp" &&
      userInput.length <= 0 &&
      !(e.metaKey || e.altKey || e.ctrlKey)
    ) {
      setUserInput(chatStore.lastInput ?? "");
      e.preventDefault();
      return;
    }
  };

  const accessStore = useAccessStore();

  const context: RenderMessage[] = useMemo(() => {
    return session.mask.hideContext ? [] : session.mask.context.slice();
  }, [session.mask.context, session.mask.hideContext]);

  if (
    context.length === 0 &&
    session.messages.at(0)?.content !== BOT_HELLO.content
  ) {
    const copiedHello = Object.assign({}, BOT_HELLO);
    if (!accessStore.isAuthorized()) {
      copiedHello.content = Locale.Error.Unauthorized;
    }
    context.push(copiedHello);
  }

  // preview messages
  const renderMessages = useMemo(() => {
      return context
        .concat(session.messages as RenderMessage[])
        .concat(
          isLoading
            ? [
              {
                ...createMessage({
                  role: "assistant",
                  content: "……",
                }),
                preview: true,
              },
            ]
            : [],
        )
    },
    [
      config.sendPreviewBubble,
      context,
      isLoading,
      session.messages,
      userInput,
    ]);

  const [msgRenderIndex, _setMsgRenderIndex] = useState(
    Math.max(0, renderMessages.length - CHAT_PAGE_SIZE),
  );
  function setMsgRenderIndex(newIndex: number) {
    newIndex = Math.min(renderMessages.length - CHAT_PAGE_SIZE, newIndex);
    newIndex = Math.max(0, newIndex);
    _setMsgRenderIndex(newIndex);
  }

  const messages = useMemo(() => {
    const endRenderIndex = Math.min(
      msgRenderIndex + 3 * CHAT_PAGE_SIZE,
      renderMessages.length,
    );
    return renderMessages.slice(msgRenderIndex, endRenderIndex);
  }, [msgRenderIndex, renderMessages]);

  const onChatBodyScroll = (e: HTMLElement) => {

    const bottomHeight = e.scrollTop + e.clientHeight;
    const edgeThreshold = e.clientHeight;
    const isTouchTopEdge = e.scrollTop <= edgeThreshold;
    const isTouchBottomEdge = bottomHeight >= e.scrollHeight - edgeThreshold;
    const isHitBottom = bottomHeight >= e.scrollHeight - (isMobileScreen ? 4 : 10);
    const prevPageMsgIndex = msgRenderIndex - CHAT_PAGE_SIZE;
    const nextPageMsgIndex = msgRenderIndex + CHAT_PAGE_SIZE;

    if (isTouchTopEdge && !isTouchBottomEdge) {
      setMsgRenderIndex(prevPageMsgIndex);
    } else if (isTouchBottomEdge) {
      setMsgRenderIndex(nextPageMsgIndex);
    }

    setAutoScroll(isHitBottom);
  };
  function scrollToBottom() {
    setMsgRenderIndex(renderMessages.length - CHAT_PAGE_SIZE);
    scrollDomToBottom();
  }

  const clientConfig = useMemo(() => getClientConfig(), []);

  const showMaxIcon = !isMobileScreen && !clientConfig?.isApp;

  // remember unfinished input
  useEffect(() => {
    // try to load from local storage
    const key = UNFINISHED_INPUT(session.id);
    const mayBeUnfinishedInput = localStorage.getItem(key);
    if (mayBeUnfinishedInput && userInput.length === 0) {
      setUserInput(mayBeUnfinishedInput);
      localStorage.removeItem(key);
    }

    const dom = inputRef.current;
    return () => {
      localStorage.setItem(key, dom?.value ?? "");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className={styles.chat} key={session.id}>
        {/*标题行*/}
        <div className="window-header" data-tauri-drag-region>
          {/*手机端返回主页面按钮*/}
          {isMobileScreen && (
            <div className="window-actions">
              <div className={"window-action-button"}>
                <IconButton
                  icon={<ReturnIcon />}
                  bordered
                  title={Locale.Chat.Actions.ChatList}
                  onClick={() => navigate(Path.Home)}
                />
              </div>
            </div>
          )}
          {/*标题文字*/}
          <div className={clsx("window-header-title", styles["chat-body-title"])}>
            {/*主标题：新的聊天*/}
            <div className={clsx("window-header-main-title", styles["chat-body-main-title"])}>
              {!session.topic ? DEFAULT_TOPIC : session.topic}
            </div>
            {/*副标题：共N条对话*/}
            <div className="window-header-sub-title">
              {Locale.Chat.SubTitle(session.messages.length)}
            </div>
          </div>

          {/*最右侧按钮*/}
          <div className="window-actions">
            {/*-------------------------------------------------------------------------------------全屏按钮*/}
            {showMaxIcon && (
              <div className="window-action-button">
                <IconButton
                  icon={config.tightBorder ? <MinIcon /> : <MaxIcon />}
                  bordered
                  title={Locale.Chat.Actions.FullScreen}
                  aria={Locale.Chat.Actions.FullScreen}
                  onClick={() => {
                    config.update(
                      (config) => (config.tightBorder = !config.tightBorder),
                    );
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {/*聊天框*/}
        <div className={styles["chat-main"]}>
          <div className={styles["chat-body-container"]}>
            {/*-------------------------------------------------------------------------------------历史聊天信息*/}
            <div
              className={styles["chat-body"]}
              ref={scrollRef}
              onScroll={(e) => onChatBodyScroll(e.currentTarget)}
              onMouseDown={() => inputRef.current?.blur()}
              onTouchStart={() => {
                inputRef.current?.blur();
                setAutoScroll(false);
              }}
            >
              {messages.map((message, i) => {
                const isUser = message.role === "user";
                const isContext = i < context.length;

                return (
                  <Fragment key={message.id}>
                    <div
                      className={
                        isUser
                          ? styles["chat-message-user"]
                          : styles["chat-message"]
                      }
                    >
                      <div className={styles["chat-message-container"]}>
                        <div className={styles["chat-message-header"]}>
                          <div className={styles["chat-message-avatar"]}>
                            {isUser ? (
                              // 用户头像
                              <Avatar avatar={config.avatar} />
                            ) : (
                              // AI头像
                              <Avatar model={message.model || session.mask.modelConfig.model} />
                            )}
                          </div>
                          {!isUser && (
                            <div className={styles["chat-model-name"]}>
                              {/*ai模型名称*/}
                              {/*{message.model}*/}
                              xju_AI
                            </div>
                          )}
                        </div>

                        <div className={styles["chat-message-item"]}>
                          {/*单条消息*/}
                          {getMessageTextContent(message)}
                        </div>
                        {message?.audio_url && (
                          <div className={styles["chat-message-audio"]}>
                            <audio src={message.audio_url} controls />
                          </div>
                        )}

                        <div className={styles["chat-message-action-date"]}>
                          {isContext
                            ? Locale.Chat.IsContext
                            : message.date.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
            </div>
            {/*-------------------------------------------------------------------------------------聊天输入框*/}
            <div className={styles["chat-input-panel"]}>
              {/* todo 输入框以及发送按钮*/}
              <label
                className={clsx(styles["chat-input-panel-inner,chat-input-panel-inner-attach"])}
                htmlFor="chat-input"
              >
                <textarea
                  id="chat-input"
                  ref={inputRef}
                  className={styles["chat-input"]}
                  placeholder={"欢迎体验xju_AI，精力有限、算力有限、经费有限，应付课程设计使用，理解万岁！！！"} // 提示用户输入
                  onInput={(e) => setUserInput(e.currentTarget.value)} // 用户输入时的回调
                  value={userInput}
                  onKeyDown={onInputKeyDown} // 当用户按下键盘时触发
                  onFocus={scrollToBottom}
                  onClick={scrollToBottom}
                  rows={4}
                  autoFocus={!isMobileScreen}
                  style={{
                    fontSize: config.fontSize,
                    fontFamily: config.fontFamily,
                  }}
                />
                {/*发送按钮*/}
                <IconButton
                  icon={<SendWhiteIcon />}
                  text={Locale.Chat.Send}
                  className={styles["chat-input-send"]}
                  type="primary"
                  onClick={() => doSubmit(userInput)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// 包装 _Chat 组件，确保在会话变化时重新渲染。
export function Chat() {
  const chatStore = useChatStore();
  const session = chatStore.currentSession();
  return <_Chat key={session.id}></_Chat>;
}