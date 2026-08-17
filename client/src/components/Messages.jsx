import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getConversations, getDirectMessages, getProjectMessages, sendMessage, editMessage, deleteMessage, clearDirectChat, deleteMessageForMe } from "../api/messageApi";
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

  // Team Members Popover States
  const [teamMembersMap, setTeamMembersMap] = useState({});
  const [showTeamMembersDropdown, setShowTeamMembersDropdown] = useState(false);
  const teamDropdownRef = useRef(null);
  const teamHeaderBtnRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessageText, setNewMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Message Management States
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  // deleteModal: { msg, mode: 'everyone' | 'me' } | null
  const [deleteModal, setDeleteModal] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  // contextMenu: { visible, x, y, msg } | null
  const [contextMenu, setContextMenu] = useState(null);
  const chatContainerRef = useRef(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const showToast = useToast();

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const currentUserId = currentUser._id || currentUser.id;

  useEffect(() => {
    activeChannelRef.current = activeChannel;
    setShowTeamMembersDropdown(false);
  }, [activeChannel]);

  // Click outside and Escape key handler for Team Members popover
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showTeamMembersDropdown &&
        teamDropdownRef.current &&
        !teamDropdownRef.current.contains(event.target) &&
        teamHeaderBtnRef.current &&
        !teamHeaderBtnRef.current.contains(event.target)
      ) {
        setShowTeamMembersDropdown(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowTeamMembersDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showTeamMembersDropdown]);

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

    socketRef.current.on("message_edited", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
      );
    });

    socketRef.current.on("message_deleted", (updatedMessage) => {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === updatedMessage._id ? updatedMessage : msg))
      );
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

          // Populate initial unread counts, last message previews, and team members from backend
          const initialUnread = {};
          const initialLastMsg = {};
          const initialMembers = {};

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
            if (t.members) {
              initialMembers[t._id] = t.members;
            }
          });

          setUnreadByChannel((prev) => ({ ...initialUnread, ...prev }));
          setLastMessageByChannel((prev) => ({ ...initialLastMsg, ...prev }));
          setTeamMembersMap((prev) => ({ ...initialMembers, ...prev }));

          // If initialPeer is passed from parent component (e.g. MyConnections), pre-select it!
          if (initialPeer) {
            const peerId = initialPeer._id || initialPeer.id;
            const name = initialPeer.fullName || initialPeer.name || "Student";
            const branchYear = [
              initialPeer.branch || initialPeer.department,
              initialPeer.year ? `${initialPeer.year} Year` : null
            ].filter(Boolean).join(" • ") || "Student";
            const avatar = initialPeer.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;

            const foundDirect = direct.find((d) => String(d._id) === String(peerId));
            const fullPeer = foundDirect || initialPeer;

            setActiveChannel({
              type: "direct",
              id: peerId,
              name: name,
              subtitle: branchYear,
              avatar: avatar,
              peerObj: fullPeer
            });
          } else if (team.length > 0) {
            const firstTeam = team[0];
            setActiveChannel({
              type: "team",
              id: firstTeam._id,
              name: firstTeam.title,
              subtitle: `${firstTeam.category} • ${firstTeam.status || "Active"}`,
              avatar: null,
              members: firstTeam.members || []
            });
          } else if (direct.length > 0) {
            const firstDirect = direct[0];
            const name = firstDirect.name || firstDirect.fullName || "Student";
            const branchYear = [
              firstDirect.branch || firstDirect.department,
              firstDirect.year ? `${firstDirect.year} Year` : null
            ].filter(Boolean).join(" • ") || "Student";

            setActiveChannel({
              type: "direct",
              id: firstDirect._id,
              name: name,
              subtitle: branchYear,
              avatar: firstDirect.avatar,
              peerObj: firstDirect
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
          if (res.success && res.project?.members) {
            setTeamMembersMap((prev) => ({
              ...prev,
              [activeChannel.id]: res.project.members
            }));
          }
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

  // 5. Message Edit Handler
  const handleSaveEdit = async (messageId) => {
    if (!editText || !editText.trim()) return;
    try {
      const res = await editMessage(messageId, editText.trim());
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? res.data : msg))
        );
        showToast("Message updated", "success");
      }
    } catch (err) {
      console.error("Failed to edit message:", err);
      showToast(err.response?.data?.message || "Failed to edit message", "error");
    } finally {
      setEditingMessageId(null);
      setEditText("");
    }
  };

  // 6. Delete for Everyone
  const handleDeleteForEveryone = async () => {
    if (!deleteModal) return;
    try {
      const res = await deleteMessage(deleteModal.msg._id);
      if (res.success && res.data) {
        setMessages((prev) =>
          prev.map((msg) => (msg._id === deleteModal.msg._id ? res.data : msg))
        );
        showToast("Message deleted for everyone", "success");
      }
    } catch (err) {
      console.error("Failed to delete message:", err);
      showToast(err.response?.data?.message || "Failed to delete message", "error");
    } finally {
      setDeleteModal(null);
    }
  };

  // 7. Delete for Me only
  const handleDeleteForMe = async () => {
    if (!deleteModal) return;
    try {
      await deleteMessageForMe(deleteModal.msg._id);
      setMessages((prev) => prev.filter((msg) => msg._id !== deleteModal.msg._id));
      showToast("Message removed from your view", "success");
    } catch (err) {
      console.error("Failed to delete message for me:", err);
      showToast(err.response?.data?.message || "Failed to remove message", "error");
    } finally {
      setDeleteModal(null);
    }
  };

  // 8. Clear Chat Handler
  const handleClearChat = async () => {
    if (!activeChannel) return;
    try {
      setClearingChat(true);
      if (activeChannel.type === "direct") {
        await clearDirectChat(activeChannel.id);
      }
      setMessages([]);
      showToast("Chat cleared successfully", "success");
    } catch (err) {
      console.error("Failed to clear chat:", err);
      showToast(err.response?.data?.message || "Failed to clear chat", "error");
    } finally {
      setClearingChat(false);
      setShowClearConfirm(false);
    }
  };

  // 9. Right-click context menu handler
  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();
    const MENU_W = 200;
    const MENU_H = 120;
    const x = Math.min(e.clientX, window.innerWidth - MENU_W - 8);
    const y = Math.min(e.clientY, window.innerHeight - MENU_H - 8);
    setContextMenu({ visible: true, x, y, msg });
  };

  const closeContextMenu = () => setContextMenu(null);

  // Close context menu on any outside click or scroll
  useEffect(() => {
    const handler = () => closeContextMenu();
    document.addEventListener("click", handler);
    document.addEventListener("scroll", handler, true);
    return () => {
      document.removeEventListener("click", handler);
      document.removeEventListener("scroll", handler, true);
    };
  }, []);

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
    <>
      <div className="space-y-6 animate-fadeIn">
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
                            avatar: null,
                            members: team.members || []
                          });
                          setShowTeamMembersDropdown(false);
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
                          const name = peer.name || peer.fullName || "Student";
                          const branchYear = [
                            peer.branch || peer.department,
                            peer.year ? `${peer.year} Year` : null
                          ].filter(Boolean).join(" • ") || "Student";

                          setActiveChannel({
                            type: "direct",
                            id: peer._id,
                            name: name,
                            subtitle: branchYear,
                            avatar: peer.avatar,
                            peerObj: peer
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
              <div className="px-6 py-4 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0 relative">
                {activeChannel.type === "direct" ? (
                  <div
                    onClick={() => {
                      if (onSelectPeer) {
                        const peerData = activeChannel.peerObj || conversations.directChats.find((c) => String(c._id) === String(activeChannel.id));
                        onSelectPeer(peerData || {
                          _id: activeChannel.id,
                          fullName: activeChannel.name,
                          name: activeChannel.name,
                          avatar: activeChannel.avatar,
                          branch: activeChannel.subtitle
                        });
                      }
                    }}
                    className="flex items-center gap-3 min-w-0 cursor-pointer group"
                    title="Click to view student profile"
                  >
                    <img
                      src={activeChannel.avatar}
                      alt={activeChannel.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 group-hover:ring-2 ring-blue-500 transition"
                    />
                    <div className="truncate">
                      <h2 className="text-sm md:text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition truncate">
                        {activeChannel.name}
                      </h2>
                      <p className="text-[11px] font-semibold text-slate-400 truncate">
                        {activeChannel.subtitle}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative min-w-0">
                    <button
                      ref={teamHeaderBtnRef}
                      type="button"
                      onClick={() => setShowTeamMembersDropdown((prev) => !prev)}
                      className="flex items-center gap-3 min-w-0 text-left hover:opacity-95 transition cursor-pointer group focus:outline-none"
                      title="Click to view project team members"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-extrabold text-base shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition shadow-sm">
                        #
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-sm md:text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition truncate">
                            {activeChannel.name}
                          </h2>
                          <svg
                            className={`w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform duration-200 shrink-0 ${
                              showTeamMembersDropdown ? "rotate-180 text-blue-600" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{activeChannel.subtitle}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-blue-600 font-bold group-hover:underline">
                            {(teamMembersMap[activeChannel.id] || activeChannel.members || []).length}{" "}
                            {(teamMembersMap[activeChannel.id] || activeChannel.members || []).length === 1 ? "member" : "members"}
                          </span>
                        </p>
                      </div>
                    </button>

                    {/* Team Members Dropdown Popover */}
                    {showTeamMembersDropdown && (
                      <div
                        ref={teamDropdownRef}
                        className="absolute top-full left-0 mt-2.5 z-50 w-80 sm:w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 animate-scaleIn origin-top-left"
                      >
                        {/* Popover Header */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                              👥
                            </div>
                            <div>
                              <h3 className="text-xs font-extrabold text-slate-900 leading-tight">
                                Project Team Members
                              </h3>
                              <p className="text-[10px] font-semibold text-slate-400">
                                {(teamMembersMap[activeChannel.id] || activeChannel.members || []).length}{" "}
                                {(teamMembersMap[activeChannel.id] || activeChannel.members || []).length === 1 ? "member" : "members"} enrolled
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowTeamMembersDropdown(false)}
                            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Close"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Members List */}
                        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                          {!(teamMembersMap[activeChannel.id] || activeChannel.members) || (teamMembersMap[activeChannel.id] || activeChannel.members).length === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400 font-medium">
                              No team members found
                            </div>
                          ) : (
                            (teamMembersMap[activeChannel.id] || activeChannel.members).map((member, idx) => {
                              const memName = member.fullName || member.name || "Student";
                              const memAvatar =
                                member.avatar ||
                                member.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(memName)}&background=0D8ABC&color=fff`;
                              const isLead = member.isOwner || member.role === "Lead Developer";
                              const academicInfo = [
                                member.branch || member.department,
                                member.year ? (String(member.year).toLowerCase().includes("year") ? member.year : `${member.year} Year`) : null,
                                member.college
                              ]
                                .filter(Boolean)
                                .join(" • ");

                              return (
                                <div
                                  key={member._id || idx}
                                  onClick={() => {
                                    if (onSelectPeer) {
                                      onSelectPeer(member);
                                      setShowTeamMembersDropdown(false);
                                    }
                                  }}
                                  className="flex items-center gap-3 p-2 hover:bg-slate-50 border border-transparent hover:border-slate-200/80 rounded-xl transition cursor-pointer group"
                                  title={onSelectPeer ? "Click to view full profile" : ""}
                                >
                                  <div className="relative shrink-0">
                                    <img
                                      src={memAvatar}
                                      alt={memName}
                                      className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                    />
                                    {isLead && (
                                      <span
                                        className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full ring-2 ring-white flex items-center justify-center text-[8px] text-white font-black"
                                        title="Project Lead"
                                      >
                                        ★
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition truncate">
                                        {memName}
                                      </p>
                                      {isLead ? (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/80 shrink-0">
                                          Lead
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                                          Member
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                      {academicInfo || member.email || "Student"}
                                    </p>
                                  </div>

                                  {onSelectPeer && (
                                    <span className="text-[10px] text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition shrink-0 pl-1">
                                      Profile →
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="Clear chat for me"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Clear Chat</span>
                  </button>
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

                    const isEditingThis = editingMessageId === msg._id;

                    return (
                      <div
                        key={msg._id || msg.id || Math.random()}
                        className={`flex items-end gap-2.5 ${isSelf ? "justify-end" : "justify-start"}`}
                        onContextMenu={(e) => handleContextMenu(e, msg)}
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

                          {isEditingThis ? (
                            <div className="bg-white border border-blue-300 p-2.5 rounded-2xl shadow-md space-y-2 text-left">
                              <textarea
                                value={editText}
                                autoFocus
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(msg._id); }
                                  if (e.key === "Escape") { setEditingMessageId(null); setEditText(""); }
                                }}
                                className="w-full text-xs text-slate-800 p-2 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 resize-none"
                                rows={2}
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button type="button" onClick={() => { setEditingMessageId(null); setEditText(""); }} className="px-2.5 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">Cancel</button>
                                <button type="button" onClick={() => handleSaveEdit(msg._id)} className="px-3 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer">Save</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`px-4 py-2.5 text-xs font-medium leading-relaxed whitespace-pre-wrap shadow-sm select-text cursor-context-menu ${
                                msg.isDeleted
                                  ? "bg-slate-100 text-slate-400 italic border border-slate-200/80 rounded-2xl"
                                  : isSelf
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none"
                                  : "bg-white text-slate-800 border border-slate-200/80 rounded-2xl rounded-tl-none"
                              }`}
                            >
                              {msg.content}
                            </div>
                          )}

                          <div className={`flex items-center gap-1 text-[9px] font-semibold text-slate-400 px-1 ${isSelf ? "justify-end" : "justify-start"}`}>
                            <span>{timeStr}</span>
                            {msg.isEdited && !msg.isDeleted && (
                              <span className="italic text-slate-400 font-normal">• (Edited)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Clear Chat Confirmation Modal */}
              {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Clear Conversation?</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        This will clear the message history for you. Other participants will still be able to view the chat history.
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        disabled={clearingChat}
                        onClick={() => setShowClearConfirm(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={clearingChat}
                        onClick={handleClearChat}
                        className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {clearingChat ? "Clearing..." : "Clear Chat"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete Message Confirmation Modal */}
              {deleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4">
                    <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">
                        {deleteModal.mode === "everyone" ? "Delete for Everyone?" : "Remove for Me?"}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {deleteModal.mode === "everyone"
                          ? "This message will be replaced with a placeholder for all participants."
                          : "This message will be hidden only from your view. Other participants can still see it."}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setDeleteModal(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={deleteModal.mode === "everyone" ? handleDeleteForEveryone : handleDeleteForMe}
                        className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md cursor-pointer"
                      >
                        {deleteModal.mode === "everyone" ? "Delete for Everyone" : "Remove for Me"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

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

      {/* Right-click Context Menu — rendered as fixed overlay */}
      {contextMenu?.visible && (() => {
        const ctxMsg = contextMenu.msg;
        const senderObj = typeof ctxMsg.sender === "object" ? ctxMsg.sender : {};
        const senderId = senderObj._id || ctxMsg.sender;
        const isSelfMsg = String(senderId) === String(currentUserId);
        return (
          <div
            className="fixed z-[9999] min-w-[180px] bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 overflow-hidden"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {isSelfMsg && !ctxMsg.isDeleted && (
              <button type="button" onClick={() => { setEditingMessageId(ctxMsg._id); setEditText(ctxMsg.content); closeContextMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition text-left">
                <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Edit
              </button>
            )}
            {isSelfMsg && !ctxMsg.isDeleted && (
              <button type="button" onClick={() => { setDeleteModal({ msg: ctxMsg, mode: "everyone" }); closeContextMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition text-left">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete for everyone
              </button>
            )}
            {isSelfMsg && !ctxMsg.isDeleted && <div className="my-1 border-t border-slate-100" />}
            <button type="button" onClick={() => { setDeleteModal({ msg: ctxMsg, mode: "me" }); closeContextMenu(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition text-left">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              Delete for me
            </button>
          </div>
        );
      })()}
    </>
  );
}
