import React, { useState } from 'react';
import { TikTokLogo, SunIcon, MoonIcon, ChevronLeft } from '../icons';
import type { SportswearEntry } from '../../types/auth';

interface SportswearContestViewProps {
  userPhoneOrName?: string;
  userId?: number | string | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onExit: () => void;
  showToast: (msg: string) => void;
}

const KITS = [
  {
    id: 'urban_sport',
    name: 'Kit Urban Sport TikTok',
    desc: 'Hoodie Oversize premium + Jogger térmico con detalles reflectantes Neón.',
    icon: '🥋',
    tag: 'MÁS POPULAR',
  },
  {
    id: 'pro_training',
    name: 'Kit Pro Training Dry-Fit',
    desc: 'Camiseta compresión transpirable + Shorts con bolsillo oculto + Muñequeras.',
    icon: '⚡',
    tag: 'ALTO RENDIMIENTO',
  },
  {
    id: 'retro_windbreaker',
    name: 'Kit Retro Streetwear',
    desc: 'Chaqueta cortavientos impermeable edición TikTok Glitch + Pantalón track.',
    icon: '🔥',
    tag: 'EDICIÓN LIMITADA',
  },
];

const CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['37', '38', '39', '40', '41', '42', '43', '44', '45'];

const COLORWAYS = [
  { id: 'dark_cyber', name: 'Dark Cyber Neon', preview: 'bg-black border-cyan-400 text-cyan-300' },
  { id: 'pure_white', name: 'Pure White Athletic', preview: 'bg-white border-red-500 text-gray-900' },
  { id: 'holographic', name: 'Holographic Glitch', preview: 'bg-linear-to-r from-purple-900 via-cyan-900 to-pink-900 border-pink-400 text-pink-200' },
];

export const SportswearContestView: React.FC<SportswearContestViewProps> = ({
  userPhoneOrName = '',
  userId,
  darkMode,
  onToggleDarkMode,
  onExit,
  showToast,
}) => {
  // Form States
  const [fullName, setFullName] = useState('');
  const [tiktokUser, setTiktokUser] = useState(
    userPhoneOrName.startsWith('+') || /^\d+$/.test(userPhoneOrName)
      ? `@tiktok_user_${userPhoneOrName.slice(-4)}`
      : userPhoneOrName.startsWith('@')
      ? userPhoneOrName
      : `@${userPhoneOrName || 'usuario'}`
  );
  const [phone, setPhone] = useState(userPhoneOrName || '');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [selectedKit, setSelectedKit] = useState('urban_sport');
  const [clothingSize, setClothingSize] = useState('M');
  const [shoeSize, setShoeSize] = useState('41');
  const [colorway, setColorway] = useState('dark_cyber');

  // Submission / Ticket States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<SportswearEntry | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !address.trim() || !city.trim()) {
      showToast('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const randomTicketNum = `TK-SPORT-${Math.floor(10000 + Math.random() * 90000)}`;
      const newEntry: SportswearEntry = {
        id: `entry_${Date.now()}`,
        userId: userId ?? undefined,
        fullName: fullName.trim(),
        tiktokUser: tiktokUser.trim(),
        phone: phone.trim(),
        city: city.trim(),
        address: address.trim(),
        kitType: KITS.find((k) => k.id === selectedKit)?.name || selectedKit,
        clothingSize,
        shoeSize,
        colorway: COLORWAYS.find((c) => c.id === colorway)?.name || colorway,
        ticketNumber: randomTicketNum,
        createdAt: new Date().toLocaleString(),
      };

      // Guardar en localStorage para auditoría y visualización en AdminPanel
      try {
        const existingRaw = localStorage.getItem('tiktok_sportswear_entries');
        const existing: SportswearEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem('tiktok_sportswear_entries', JSON.stringify([newEntry, ...existing]));
      } catch (err) {
        console.error('Error al guardar en storage:', err);
      }

      setTicket(newEntry);
      setIsSubmitting(false);
      showToast('🎉 ¡Registro completado! Tu boleto ha sido generado.');
    }, 900);
  };

  const handleCopyTicket = () => {
    if (!ticket) return;
    navigator.clipboard.writeText(ticket.ticketNumber);
    setCopiedTicket(true);
    showToast(`Boleto ${ticket.ticketNumber} copiado al portapapeles`);
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  return (
    <div
      className={`min-h-screen w-full transition-colors duration-200 flex flex-col items-center ${
        darkMode ? 'bg-[#121212] text-white' : 'bg-gray-50 text-[#161823]'
      } font-sans selection:bg-[#FE2C55]/20 pb-12`}
    >
      {/* Top Navbar */}
      <header
        className={`w-full h-14 border-b flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 backdrop-blur-md ${
          darkMode ? 'bg-[#121212]/90 border-gray-800' : 'bg-white/90 border-gray-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-1.5 -ml-1 rounded-full hover:bg-gray-500/15 transition-all cursor-pointer flex items-center gap-1 text-xs text-gray-500 hover:text-black dark:hover:text-white"
            title="Volver"
          >
            <ChevronLeft />
          </button>
          <div className="flex items-center gap-2">
            <TikTokLogo className="w-6 h-6" />
            <span className="font-extrabold tracking-tight text-base">TikTok</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-[#FE2C55]/10 text-[#FE2C55] border border-[#FE2C55]/30">
              Rewards
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Verified User Pill */}
          {userPhoneOrName && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                darkMode ? 'bg-white/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Verificado: {userPhoneOrName}</span>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              darkMode ? 'bg-white/10 hover:bg-white/20 text-yellow-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-2xl px-4 sm:px-6 pt-6">
        {/* Ticket Screen (If already registered) */}
        {ticket ? (
          <div className="flex flex-col items-center animate-fade-in text-center py-4">
            <div className="w-16 h-16 rounded-full bg-[#FE2C55]/10 text-[#FE2C55] flex items-center justify-center text-3xl mb-3 shadow-lg shadow-[#FE2C55]/20 animate-bounce">
              🏆
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
              ¡Boleto de Participación Generado!
            </h1>
            <p className={`text-sm max-w-md mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Tu registro para el sorteo oficial de ropa deportiva TikTok ha sido confirmado con éxito. Guarda tu folio para el día del evento.
            </p>

            {/* Golden Ticket Card */}
            <div className="w-full max-w-md relative rounded-3xl p-6 sm:p-7 text-left shadow-2xl overflow-hidden bg-linear-to-br from-[#1e1e24] via-[#121212] to-[#0a0a0c] text-white border-2 border-yellow-500/50">
              {/* Holographic glowing badge */}
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#FE2C55]/20 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 w-28 h-28 bg-[#25F4EE]/20 rounded-full blur-2xl pointer-events-none" />

              {/* Ticket Header */}
              <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <TikTokLogo className="w-7 h-7" />
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-widest text-[#FE2C55]">
                      TikTok Official Contest
                    </span>
                    <h3 className="text-base font-bold text-white leading-tight">Sportswear Kit 2026</h3>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  PARTICIPANTE
                </span>
              </div>

              {/* Folio Highlight */}
              <div className="bg-black/60 border border-gray-800 rounded-2xl p-4 mb-4 text-center">
                <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                  Número de Boleto Oficial
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-[#25F4EE] select-all">
                  {ticket.ticketNumber}
                </span>
              </div>

              {/* Summary Details */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                <div>
                  <span className="text-gray-500 block text-[11px]">Participante</span>
                  <span className="font-semibold text-white truncate block">{ticket.fullName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Usuario TikTok</span>
                  <span className="font-semibold text-[#FE2C55] truncate block">{ticket.tiktokUser}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Teléfono de Contacto</span>
                  <span className="font-semibold text-emerald-300 truncate block font-mono">
                    📞 {ticket.phone || 'No registrado'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Destino de Envío</span>
                  <span className="font-semibold text-gray-300 truncate block">
                    📍 {ticket.city}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Kit Seleccionado</span>
                  <span className="font-semibold text-gray-200 truncate block">{ticket.kitType}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[11px]">Talla Ropa / Calzado</span>
                  <span className="font-semibold text-yellow-300 block font-mono">
                    {ticket.clothingSize} / {ticket.shoeSize} EU
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Colorway: <span className="text-gray-300 font-semibold">{ticket.colorway}</span></span>
                  <span className="text-gray-500 truncate max-w-[210px]" title={ticket.address}>
                    Dirección: <span className="text-gray-300 font-semibold">{ticket.address}</span>
                  </span>
                </div>
              </div>

              {/* Barcode Simulator */}
              <div className="border-t border-dashed border-gray-800 pt-4 flex flex-col items-center">
                <div className="h-8 w-4/5 flex items-center justify-between gap-1 opacity-70">
                  {Array.from({ length: 38 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-full ${i % 3 === 0 ? 'w-1 bg-white' : i % 2 === 0 ? 'w-0.5 bg-gray-400' : 'w-1.5 bg-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-gray-500 mt-1 tracking-widest">
                  VALIDATION-HASH-TK-{ticket.id.slice(-6)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-6">
              <button
                onClick={handleCopyTicket}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-white text-black hover:bg-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-lg"
              >
                <span>{copiedTicket ? '✓ Copiado' : '📋 Copiar Folio'}</span>
              </button>
              <button
                onClick={() => setTicket(null)}
                className="py-3 px-4 rounded-xl font-bold text-sm bg-gray-800 hover:bg-gray-700 text-white transition-all cursor-pointer"
              >
                Registrar otro participante
              </button>
            </div>
          </div>
        ) : (
          /* Giveaway Form */
          <div className="animate-fade-in">
            {/* Header Hero Banner */}
            <div
              className={`rounded-2xl p-6 sm:p-7 mb-6 relative overflow-hidden border ${
                darkMode
                  ? 'bg-linear-to-br from-[#1f1215] via-[#161823] to-[#0f1922] border-gray-800'
                  : 'bg-linear-to-br from-red-50 via-white to-cyan-50 border-gray-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#FE2C55] mb-2">
                <span className="animate-pulse">●</span>
                <span>Evento Oficial TikTok Sportswear</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
                Gana tu Kit de Ropa Deportiva TikTok 2026
              </h1>
              <p className={`text-xs sm:text-sm max-w-lg leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Como parte de la comunidad TikTok verificada, participa gratuitamente en el sorteo de indumentaria deportiva oficial edición exclusiva Creator Pro.
              </p>

              {/* Decorative Brand Circles */}
              <div className="absolute right-3 -bottom-4 w-28 h-28 rounded-full bg-[#FE2C55]/10 blur-xl pointer-events-none" />
              <div className="absolute right-16 -top-4 w-24 h-24 rounded-full bg-[#25F4EE]/10 blur-xl pointer-events-none" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: Personal & Shipping Data */}
              <div
                className={`rounded-2xl p-5 border ${
                  darkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-xs'
                }`}
              >
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                  <span>📍</span>
                  <span>Datos del Participante y Envío</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold mb-1.5">Nombre y Apellido Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Luis Mendoza"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-hidden transition-all ${
                        darkMode
                          ? 'bg-[#121212] border-gray-700 focus:border-[#FE2C55]'
                          : 'bg-gray-50 border-gray-300 focus:border-black'
                      }`}
                    />
                  </div>

                  {/* TikTok Username */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Usuario de TikTok (@) *</label>
                    <input
                      type="text"
                      required
                      placeholder="@usuario_tiktok"
                      value={tiktokUser}
                      onChange={(e) => setTiktokUser(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-hidden font-mono transition-all ${
                        darkMode
                          ? 'bg-[#121212] border-gray-700 focus:border-[#FE2C55]'
                          : 'bg-gray-50 border-gray-300 focus:border-black'
                      }`}
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Teléfono de Contacto</label>
                    <input
                      type="tel"
                      required
                      placeholder="+57 300 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-hidden transition-all ${
                        darkMode
                          ? 'bg-[#121212] border-gray-700 focus:border-[#FE2C55]'
                          : 'bg-gray-50 border-gray-300 focus:border-black'
                      }`}
                    />
                  </div>

                  {/* City */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Ciudad *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Bogotá, Medellín, etc."
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-hidden transition-all ${
                        darkMode
                          ? 'bg-[#121212] border-gray-700 focus:border-[#FE2C55]'
                          : 'bg-gray-50 border-gray-300 focus:border-black'
                      }`}
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-xs font-semibold mb-1.5">Dirección de Entrega *</label>
                    <input
                      type="text"
                      required
                      placeholder="Calle, Carrera, No., Apto"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-hidden transition-all ${
                        darkMode
                          ? 'bg-[#121212] border-gray-700 focus:border-[#FE2C55]'
                          : 'bg-gray-50 border-gray-300 focus:border-black'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Kit Selection */}
              <div
                className={`rounded-2xl p-5 border ${
                  darkMode ? 'bg-[#181818] border-gray-800' : 'bg-white border-gray-200 shadow-xs'
                }`}
              >
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-2">
                  <span>👕</span>
                  <span>Selecciona el Kit Deportivo a Ganar</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {KITS.map((kit) => (
                    <div
                      key={kit.id}
                      onClick={() => setSelectedKit(kit.id)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        selectedKit === kit.id
                          ? 'border-[#FE2C55] bg-[#FE2C55]/5 shadow-md shadow-[#FE2C55]/10 scale-[1.02]'
                          : darkMode
                          ? 'border-gray-800 bg-[#121212] hover:border-gray-700'
                          : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{kit.icon}</span>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FE2C55]/10 text-[#FE2C55]">
                            {kit.tag}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm leading-tight mb-1">{kit.name}</h3>
                        <p className={`text-[11px] leading-snug ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {kit.desc}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
                        <span
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            selectedKit === kit.id ? 'border-[#FE2C55] bg-[#FE2C55]' : 'border-gray-400'
                          }`}
                        >
                          {selectedKit === kit.id && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </span>
                        <span>{selectedKit === kit.id ? 'Elegido' : 'Seleccionar'}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Clothing & Shoe Sizes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4 border-t border-gray-200 dark:border-gray-800">
                  {/* Clothing Size */}
                  <div>
                    <label className="block text-xs font-semibold mb-2">Talla de Ropa / Indumentaria</label>
                    <div className="grid grid-cols-6 gap-1.5">
                      {CLOTHING_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setClothingSize(size)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            clothingSize === size
                              ? 'bg-black text-white dark:bg-white dark:text-black border-transparent shadow-xs'
                              : darkMode
                              ? 'bg-[#121212] border-gray-800 text-gray-300 hover:border-gray-700'
                              : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shoe Size */}
                  <div>
                    <label className="block text-xs font-semibold mb-2">Talla de Tenis / Calzado (EU)</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {SHOE_SIZES.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setShoeSize(size)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            shoeSize === size
                              ? 'bg-[#FE2C55] text-white border-transparent shadow-xs shadow-[#FE2C55]/20'
                              : darkMode
                              ? 'bg-[#121212] border-gray-800 text-gray-300 hover:border-gray-700'
                              : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Colorway Selection */}
                <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800">
                  <label className="block text-xs font-semibold mb-2">Colorway Oficial Preferido</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {COLORWAYS.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setColorway(c.id)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          colorway === c.id
                            ? 'border-[#25F4EE] shadow-sm shadow-[#25F4EE]/20 bg-cyan-500/10'
                            : darkMode
                            ? 'border-gray-800 hover:border-gray-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        <span className={`w-3.5 h-3.5 rounded-full border ${c.preview}`} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-xl font-bold text-base bg-linear-to-r from-[#FE2C55] to-[#E0264B] hover:from-[#E0264B] hover:to-[#C01F3E] text-white transition-all shadow-xl shadow-[#FE2C55]/25 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generando tu Boleto Oficial...</span>
                  </>
                ) : (
                  <>
                    <span>🎟️</span>
                    <span>Obtener Mi Boleto para el Sorteo</span>
                  </>
                )}
              </button>

              {/* Privacy notice */}
              <p className="text-center text-[11px] text-gray-500">
                Al participar aceptas los términos del evento oficial TikTok Sportswear 2026. Los ganadores serán anunciados directamente en la aplicación.
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default SportswearContestView;
