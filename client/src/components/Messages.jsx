import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getConversations, getDirectMessages, getProjectMessages, sendMessage } from "../api/messageApi";
import { useToast } from "./Toast";

const SOCKET_SERVER_URL = "http://localhost:5000";

export default function Messages({ initialPeer, onSelectPeer }) {
  const [conversations, setConversations] = useState({ directChats: [], teamChats: [] });
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [channelSearch, setChannelSearch] = useState("");

  // Currently active selected channel
  // Shape: { type: 'direct' | 'team', id: string, name: string, subtitle: string, avatar: string, peerObj: object }
  const [activeChannel, setActiveChannel] = useState(null);
  const activeChannelRef = useRef(null);

  const [unreadByChannel, setUnreadByChannel] = useState({});
  const [lastMessageByChannel, setLastMessageByChannel] = useState({});

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [sending, setSending] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const showToast = useToast();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser._id || currentUser.id;

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  // Auto-scroll to bottom of messages container
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Initialize Socket.io Connection
  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);

    socketRef.current.on("connect", () => {
      console.log("Connected to Socket server:", socketRef.current.id);
    });

    socketRef.current.on("receive_message", (incomingMessage) => {
      const senderObj = typeof incomingMessage.sender === "object" ? incomingMessage.sender : {};
      const senderId = senderObj._id || incomingMessage.sender;

      let channelKey = "";
      if (incomingMessage.chatType === "direct") {
        const peerId = String(senderId) === String(currentUserId) ? incomingMessage.receiver : senderId;
        channelKey = `direct_${peerId}`;
      } else {
        channelKey = `team_${incomingMessage.project}`;
      }

      const timeStr = incomingMessage.createdAt
        ? new Date(incomingMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

      setLastMessageByChannel((prev) => ({
        ...prev,
        [channelKey]: {
          content: incomingMessage.content,
          time: timeStr
        }
      }));

      // Update current active messages list if matches active channel
      setMessages((prev) => {
        if (prev.some((m) => m._id === incomingMessage._id)) {
          return prev;
        }
        return [...prev, incomingMessage];
      });

      // Increment unread count if message is incoming from peer and channel is not active
      if (String(senderId) !== String(currentUserId)) {
        setUnreadByChannel((prev) => {
          const active = activeChannelRef.current;
          const isCurrentActive = active &&
            active.type === incomingMessage.chatType &&
            String(active.id) === String(channelKey.replace(/^(direct_|team_)/, ''));

          if (isCurrentActive) return prev;

          const currentCount = prev[channelKey] || 0;
          return { ...prev, [channelKey]: currentCount + 1 };
        });
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUserId]);

  // 2. Fetch Conversations on mount
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoadingChannels(true);
        const res = await getConversations();
        if (res.success) {
          const direct = res.directChats || [];
          const team = res.teamChats || [];

          setConversations({ directChats: direct, teamChats: team });

          // Populate initial unread counts and last message previews from backend
          const initialUnread = {};
          const initialLastMsg = {};

          direct.forEach((peer) => {
            const key = `direct_${peer._id}`;
            if (peer.unreadCount) initialUnread[key] = peer.unreadCount;
            if (peer.lastMessage) {
              initialLastMsg[key] = {
                content: peer.lastMessage,
                time: peer.lastMessageTime
              };
            }
          });

          team.forEach((t) => {
            const key = `team_${t._id}`;
            if (t.unreadCount) initialUnread[key] = t.unreadCount;
            if (t.lastMessage) {
              initialLastMsg[key] = {
                content: t.lastMessage,
                time: t.lastMessageTime
              };
            }
          });

          setUnreadByChannel((prev) => ({ ...initialUnread, ...prev }));
          setLastMessageByChannel((prev) => ({ ...initialLastMsg, ...prev }));

          // If initialPeer is passed from parent component (e.g. MyConnections), pre-select it!
          if (initialPeer) {
            const peerId = initialPeer._id || initialPeer.id;
            const name = initialPeer.fullName || initialPeer.name || "Student";
            const branchYear = [
              initialPeer.branch || initialPeer.department,
              initialPeer.year ? `${initialPeer.year} Year` : null
            ].filter(Boolean).join(" • ") || "Student";
            const avatar = initialPeer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;

            setActiveChannel({
              type: "direct",
              id: peerId,
              name: name,
              subtitle: branchYear,
              avatar: avatar
            });
          } else if (team.length > 0) {
            const firstTeam = team[0];
            setActiveChannel({
              type: "team",
              id: firstTeam._id,
              name: firstTeam.title,
              subtitle: `${firstTeam.category} • ${firstTeam.status || "Active"}`,
              avatar: null
            });
          } else if (direct.length > 0) {
            const firstDirect = direct[0];
            setActiveChannel({
              type: "direct",
              id: firstDirect._id,
              name: firstDirect.name,
              subtitle: `${firstDirect.branch} • ${firstDirect.year ? firstDirect.year + ' Year' : ''}`,
              avatar: firstDirect.avatar
            });
          }
        }
      } catch (err) {
        console.error("Error fetching conversations:", err);
      } finally {
        setLoadingChannels(false);
      }
    };

    fetchChannels();
  }, [initialPeer]);

  // 3. Handle Channel Switch & Room Joining
  useEffect(() => {
    if (!activeChannel || !socketRef.current) return;

    // Calculate unique socket room ID
    let roomId = "";
    if (activeChannel.type === "direct") {
      const sortedIds = [currentUserId, activeChannel.id].sort();
      roomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
    } else {
      roomId = `project_${activeChannel.id}`;
    }

    // Join room on Socket.io server
    socketRef.current.emit("join_room", roomId);

    // Fetch historical messages for active channel
    const fetchHistory = async () => {
      try {
        setLoadingMessages(true);
        let res;
        if (activeChannel.type === "direct") {
          res = await getDirectMessages(activeChannel.id);
        } else {
          res = await getProjectMessages(activeChannel.id);
        }

        if (res.success) {
          setMessages(res.messages || []);
        }
      } catch (err) {
        console.error("Failed to load message history:", err);
        showToast("Error loading conversation history", "error");
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchHistory();

    return () => {
      if (socketRef.current && roomId) {
        socketRef.current.emit("leave_room", roomId);
      }
    };
  }, [activeChannel, currentUserId]);

  // 4. Send Message Handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText || !newMessageText.trim() || !activeChannel) return;

    const content = newMessageText.trim();
    setNewMessageText("");

    let roomId = "";
    if (activeChannel.type === "direct") {
      const sortedIds = [currentUserId, activeChannel.id].sort();
      roomId = `dm_${sortedIds[0]}_${sortedIds[1]}`;
    } else {
      roomId = `project_${activeChannel.id}`;
    }

    const payload = {
      senderId: currentUserId,
      chatType: activeChannel.type,
      receiverId: activeChannel.type === "direct" ? activeChannel.id : undefined,
      projectId: activeChannel.type === "team" ? activeChannel.id : undefined,
      content,
      roomId
    };

    try {
      setSending(true);
      // Emit real-time message to room via Socket.io
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("send_message", payload);
      } else {
        // Fallback to REST API if Socket is re-connecting
        const res = await sendMessage(payload);
        if (res.success && res.data) {
          setMessages((prev) => [...prev, res.data]);
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      showToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  // Filter conversations based on sidebar search input
  const filteredDirectChats = conversations.directChats.filter((c) =>
    (c.name || "").toLowerCase().includes(channelSearch.toLowerCase()) ||
    (c.branch || "").toLowerCase().includes(channelSearch.toLowerCase())
  );

  const filteredTeamChats = conversations.teamChats.filter((t) =>
    (t.title || "").toLowerCase().includes(channelSearch.toLowerCase()) ||
    (t.category || "").toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Messages & Channels</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Real-time chat channels for your active project teams and connected peers.
        </p>
      </div>

      {/* Main Messaging Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm h-[calc(100vh-14rem)] min-h-[520px] flex overflow-hidden">
        
        {/* SIDEBAR: CHANNELS & DIRECT CHATS */}
        <div className="w-80 md:w-88 border-r border-slate-200/80 flex flex-col bg-slate-50/50 shrink-0">
          
          {/* Channel Search Bar */}
          <div className="p-4 border-b border-slate-200/60 bg-white">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search chats or team rooms..."
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin">
            
            {/* Section 1: Project Teams */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Project Teams</h3>
              </div>

              {loadingChannels ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium animate-pulse">
                  Loading team rooms...
                </div>
              ) : filteredTeamChats.length === 0 ? (
                <p className="text-[11px] text-slate-400 px-2 py-1 italic font-medium">No team projects found</p>
              ) : (
                <div className="space-y-1">
                  {filteredTeamChats.map((team) => {
                    const isSelected = activeChannel?.type === "team" && activeChannel?.id === team._id;
                    const channelKey = `team_${team._id}`;
                    const unreadCount = unreadByChannel[channelKey] || 0;
                    const lastMsg = lastMessageByChannel[channelKey];

                    return (
                      <button
                        key={team._id}
                        onClick={() => {
                          setActiveChannel({
                            type: "team",
                            id: team._id,
                            name: team.title,
                            subtitle: `${team.category} • ${team.status || "Active"}`,
                            avatar: null
                          });
                          setUnreadByChannel((prev) => ({ ...prev, [channelKey]: 0 }));
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                              isSelected ? "bg-white/20 text-white" : "bg-blue-50 text-blue-600 border border-blue-100"
                            }`}
                          >
                            #
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                                {team.title}
                              </p>
                              {lastMsg?.time && (
                                <span className={`text-[9px] font-semibold ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                                  {lastMsg.time}
                                </span>
                              )}
                            </div>
                            <p className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-blue-100 font-medium" : unreadCount > 0 ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"}`}>
                              {lastMsg?.content || `${team.category} • ${team.isOwner ? "Lead" : "Member"}`}
                            </p>
                          </div>
                        </div>

                        {unreadCount > 0 && !isSelected && (
                          <span className="ml-2 h-5 min-w-[20px] px-1.5 bg-green-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Direct Messages */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Direct Messages</h3>
              </div>

              {loadingChannels ? (
                <div className="p-4 text-center text-xs text-slate-400 font-medium animate-pulse">
                  Loading connections...
                </div>
              ) : filteredDirectChats.length === 0 ? (
                <p className="text-[11px] text-slate-400 px-2 py-1 italic font-medium">No connected peers yet</p>
              ) : (
                <div className="space-y-1">
                  {filteredDirectChats.map((peer) => {
                    const isSelected = activeChannel?.type === "direct" && activeChannel?.id === peer._id;
                    const channelKey = `direct_${peer._id}`;
                    const unreadCount = unreadByChannel[channelKey] || 0;
                    const lastMsg = lastMessageByChannel[channelKey];

                    return (
                      <button
                        key={peer._id}
                        onClick={() => {
                          setActiveChannel({
                            type: "direct",
                            id: peer._id,
                            name: peer.name,
                            subtitle: `${peer.branch} • ${peer.year ? peer.year + ' Year' : ''}`,
                            avatar: peer.avatar
                          });
                          setUnreadByChannel((prev) => ({ ...prev, [channelKey]: 0 }));
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/15"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative shrink-0">
                            <img
                              src={peer.avatar}
                              alt={peer.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200/60"
                            />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-xs font-bold truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                                {peer.name}
                              </p>
                              {lastMsg?.time && (
                                <span className={`text-[9px] font-semibold ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                                  {lastMsg.time}
                                </span>
                              )}
                            </div>
                            <p className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-blue-100 font-medium" : unreadCount > 0 ? "text-slate-900 font-extrabold" : "text-slate-400 font-medium"}`}>
                              {lastMsg?.content || peer.branch}
                            </p>
                          </div>
                        </div>

                        {unreadCount > 0 && !isSelected && (
                          <span className="ml-2 h-5 min-w-[20px] px-1.5 bg-green-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shrink-0 shadow-sm">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div className="flex-1 flex flex-col bg-white min-w-0">
          
          {activeChannel ? (
            <>
              {/* Active Channel Header */}
              <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
                <div
                  onClick={() => {
                    if (activeChannel.type === "direct" && onSelectPeer) {
                      onSelectPeer(activeChannel.peerObj || {
                        _id: activeChannel.id,
                        fullName: activeChannel.name,
                        avatar: activeChannel.avatar,
                        bio: activeChannel.subtitle
                      });
                    }
                  }}
                  className={`flex items-center gap-3 min-w-0 ${activeChannel.type === "direct" ? "cursor-pointer group" : ""}`}
                  title={activeChannel.type === "direct" ? "Click to view student profile" : ""}
                >
                  {activeChannel.type === "direct" ? (
                    <img
                      src={activeChannel.avatar}
                      alt={activeChannel.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 group-hover:ring-2 ring-blue-500 transition"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-extrabold text-base shrink-0">
                      #
                    </div>
                  )}
                  <div className="truncate">
                    <h2 className="text-sm md:text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition truncate flex items-center gap-1.5">
                      {activeChannel.name}
                      {activeChannel.type === "direct" && (
                        <span className="text-[10px] text-blue-600 font-normal">View Profile →</span>
                      )}
                    </h2>
                    <p className="text-[11px] font-semibold text-slate-400 truncate">
                      {activeChannel.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Live Sync
                  </span>
                </div>
              </div>

              {/* Messages Thread Container */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 scrollbar-thin">
                {loadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <svg className="animate-spin h-7 w-7 text-blue-600 mb-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-xs font-semibold">Loading conversation...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800">No messages yet</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed font-medium">
                      Start the conversation by sending a greeting below. Messages are saved securely and delivered instantly.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const senderObj = typeof msg.sender === "object" ? msg.sender : {};
                    const senderId = senderObj._id || msg.sender;
                    const isSelf = String(senderId) === String(currentUserId);
                    const senderName = senderObj.fullName || "Student";
                    const avatar = senderObj.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=0D8ABC&color=fff`;

                    const timeStr = msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : "";

                    return (
                      <div
                        key={msg._id || msg.id || Math.random()}
                        className={`flex items-end gap-2.5 ${isSelf ? "justify-end" : "justify-start"}`}
                      >
                        {!isSelf && (
                          <img
                            src={avatar}
                            alt={senderName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 mb-1"
                          />
                        )}

                        <div className={`max-w-[75%] space-y-1 ${isSelf ? "items-end text-right" : "items-start text-left"}`}>
                          {!isSelf && activeChannel.type === "team" && (
                            <p className="text-[10px] font-bold text-slate-500 pl-1">{senderName}</p>
                          )}
                          <div
                            className={`px-4 py-2.5 text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-sm ${
                              isSelf
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none"
                                : "bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-none"
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className={`block text-[9px] font-semibold text-slate-400 px-1 ${isSelf ? "text-right" : "text-left"}`}>
                            {timeStr}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Bar */}
              <div className="p-4 bg-white border-t border-slate-200/80 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder={`Message ${activeChannel.name}...`}
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    disabled={sending}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!newMessageText.trim() || sending}
                    className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/15 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <span>Send</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mb-3 border border-slate-100">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-base font-extrabold text-slate-700">Select a Conversation</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs font-medium">
                Choose a project team room or connected student from the sidebar to open the chat window.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
