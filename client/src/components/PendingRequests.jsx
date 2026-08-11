import { useState, useEffect } from "react";
import { getPendingRequests, respondConnectionRequest } from "../api/connectionApi";
import { getReceivedProjectApplications, respondProjectApplication } from "../api/projectApi";
import { useToast } from "./Toast";

export default function PendingRequests({
  connectionRequests: propsConnectionRequests,
  projectApplications: propsProjectApplications,
  onRespondConnection,
  onRespondProjectApp,
  loading: propsLoading
}) {
  const [activeSubTab, setActiveSubTab] = useState("connections"); // 'connections' | 'projectApplications'

  const isPropsMode = propsConnectionRequests !== undefined && propsProjectApplications !== undefined;

  const [internalConnectionRequests, setInternalConnectionRequests] = useState([]);
  const [internalProjectApplications, setInternalProjectApplications] = useState([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const showToast = useToast();

  const connectionRequests = isPropsMode ? propsConnectionRequests : internalConnectionRequests;
  const projectApplications = isPropsMode ? propsProjectApplications : internalProjectApplications;
  const loading = isPropsMode ? propsLoading : internalLoading;

  const fetchData = async () => {
    if (isPropsMode) return;
    try {
      setInternalLoading(true);
      const [connRes, projRes] = await Promise.allSettled([
        getPendingRequests(),
        getReceivedProjectApplications()
      ]);

      if (connRes.status === "fulfilled" && connRes.value?.success) {
        setInternalConnectionRequests(connRes.value.requests || []);
      }

      if (projRes.status === "fulfilled" && projRes.value?.success) {
        setInternalProjectApplications(projRes.value.applications || []);
      }
    } catch (err) {
      console.error("Failed to load pending requests:", err);
      setError("Failed to load pending requests");
    } finally {
      setInternalLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isPropsMode]);

  const handleRespondConnection = async (requestId, action) => {
    try {
      setProcessingId(requestId);
      if (isPropsMode && onRespondConnection) {
        await onRespondConnection(requestId, action);
      } else {
        await respondConnectionRequest(requestId, action);
        setInternalConnectionRequests((prev) => prev.filter((r) => r._id !== requestId));
      }
    } catch (err) {
      console.error(`Failed to ${action} connection request:`, err);
      const msg = err.response?.data?.message || `Failed to ${action} request`;
      showToast(msg, "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRespondProjectApp = async (applicationId, action) => {
    try {
      setProcessingId(applicationId);
      if (isPropsMode && onRespondProjectApp) {
        await onRespondProjectApp(applicationId, action);
      } else {
        await respondProjectApplication(applicationId, action);
        setInternalProjectApplications((prev) => prev.filter((app) => app._id !== applicationId));
      }
    } catch (err) {
      console.error(`Failed to ${action} project application:`, err);
      const msg = err.response?.data?.message || `Failed to ${action} application`;
      showToast(msg, "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Header Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Pending Requests & Applications
        </h1>
        <p className="text-sm font-medium text-slate-500 mt-1">
          Review incoming peer connections and applications from classmates who want to join your projects.
        </p>
      </div>

      {/* 2. Sub-Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveSubTab("connections")}
          className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeSubTab === "connections"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Peer Connection Requests
          {connectionRequests.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-extrabold bg-blue-100 text-blue-600 rounded-full">
              {connectionRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab("projectApplications")}
          className={`pb-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeSubTab === "projectApplications"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Project Join Applications
          {projectApplications.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-extrabold bg-amber-100 text-amber-700 rounded-full">
              {projectApplications.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Content Section */}
      {loading ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-semibold text-slate-500">Loading requests...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm font-medium">
          {error}
        </div>
      ) : activeSubTab === "connections" ? (
        /* ── CONNECTION REQUESTS TAB ── */
        connectionRequests.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No pending connection requests</h3>
            <p className="text-xs font-medium text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              You currently have no incoming peer connection requests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectionRequests.map((reqItem) => {
              const sender = reqItem.sender || {};
              const name = sender.fullName || sender.name || "Anonymous Student";
              const avatar = sender.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
              const college = sender.college || "University Student";
              const branchYear = [
                sender.branch || sender.department,
                sender.year ? `${sender.year} Year` : null
              ].filter(Boolean).join(" • ") || "Student";
              const bio = sender.bio || "No bio provided.";
              const skills = Array.isArray(sender.skills) ? sender.skills : [];
              const isProcessing = processingId === reqItem._id;

              return (
                <div
                  key={reqItem._id}
                  className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start gap-4">
                      <img
                        src={avatar}
                        alt={name}
                        className="w-14 h-14 rounded-xl object-cover border border-slate-100 shadow-sm"
                      />
                      <div className="space-y-0.5">
                        <h3 className="text-base font-extrabold text-slate-900 leading-snug">{name}</h3>
                        <p className="text-xs font-bold text-blue-600">{branchYear}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 mt-4 text-[10px] font-semibold text-slate-400">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span>{college}</span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed font-normal mt-3 line-clamp-3">
                      {bio}
                    </p>

                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {skills.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-600 border border-slate-100"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2.5">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespondConnection(reqItem._id, "accept")}
                      className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? "Processing..." : "Accept Connection"}
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespondConnection(reqItem._id, "reject")}
                      className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── PROJECT APPLICATIONS TAB ── */
        projectApplications.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
            <div className="h-14 w-14 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-extrabold text-slate-800">No project applications</h3>
            <p className="text-xs font-medium text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              No students have applied to join your projects yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projectApplications.map((appItem) => {
              const applicant = appItem.applicant || {};
              const project = appItem.project || {};
              const name = applicant.fullName || applicant.name || "Student Applicant";
              const avatar = applicant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`;
              const college = applicant.college || "University Student";
              const branchYear = [
                applicant.branch || applicant.department,
                applicant.year ? `${applicant.year} Year` : null
              ].filter(Boolean).join(" • ") || "Student";
              const skills = Array.isArray(applicant.skills) ? applicant.skills : [];
              const isProcessing = processingId === appItem._id;

              return (
                <div
                  key={appItem._id}
                  className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    {/* Applied Project Banner */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                      <p className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider">Wants to Join Project:</p>
                      <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{project.title || "Project"}</p>
                    </div>

                    {/* Applicant Profile */}
                    <div className="flex items-start gap-3.5">
                      <img
                        src={avatar}
                        alt={name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm"
                      />
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{name}</h3>
                        <p className="text-xs font-semibold text-slate-500">{branchYear}</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">{college}</p>
                      </div>
                    </div>

                    {/* Application Pitch / Note */}
                    {appItem.message && (
                      <div className="mt-3.5 bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Applicant Note:</p>
                        <p className="text-xs text-slate-600 italic mt-0.5">"{appItem.message}"</p>
                      </div>
                    )}

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {skills.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2.5">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespondProjectApp(appItem._id, "accept")}
                      className="flex-1 py-2.5 px-3 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md shadow-green-500/10 transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {isProcessing ? "Accepting..." : "Accept Applicant"}
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleRespondProjectApp(appItem._id, "reject")}
                      className="flex-1 py-2.5 px-3 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}


