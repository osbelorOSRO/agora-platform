export const estilos = {
  login: "flex min-h-screen w-full md:flex-row flex-col",
  animacion: "md:w-1/2 w-full flex items-center justify-center",
  animacionInner: "max-w-2xl w-full flex items-center justify-center h-[600px]",
  loginCol: "md:w-1/2 w-full flex items-center justify-center bg-azulOscuro",
  loginCard: {
    contenedor: "flex justify-center items-center w-full h-full bg-gray-900 bg-opacity-50 p-6",
    card: "w-full max-w-md bg-white bg-opacity-20 backdrop-blur-md rounded-lg p-8 shadow-lg",
    input: "w-full p-3 rounded bg-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500",
    buttonPrimary: "w-full py-3 rounded text-white bg-azulPrimario hover:bg-fondoOutput transition-colors duration-300",
    buttonSecondary: "w-full mt-2 underline text-textoInput hover:text-textoOutput cursor-pointer",
    mensajeError: "text-red-500",
    mensajeExito: "text-green-500",
    titulo: "text-3xl font-bold mb-6 text-white",
  },
chatExpandido: {
  contenedor: 'flex h-full min-h-0 w-full flex-1 bg-transparent text-textoOscuro',
  panelClientes: 'flex-1 w-full md:w-1/3 max-w-sm bg-fondoCard/40 backdrop-blur-sm p-4 overflow-y-auto border-r border-borde flex flex-col gap-4 min-h-0',
  tarjetasClientes: 'flex flex-col gap-3 pb-4',
  tituloSeccion: 'text-lg font-semibold text-azulOscuro mb-4',
  ventanaChat: 'flex min-h-0 flex-1 flex-col bg-transparent overflow-hidden',
  encabezadoChat:
    'z-20 flex shrink-0 items-center justify-between px-4 py-2 bg-fondoCard text-textoOscuro rounded-t-lg shadow',
  areaMensajes: 'min-h-0 flex-1 overflow-y-auto p-4 space-y-3',
  entradaMensaje:
    'shrink-0 p-2 border-t border-borde flex items-center gap-2 bg-fondoCard/40 backdrop-blur-sm shadow-sm',
  botonEnviar:
    'bg-fondoCard text-azulPrimario border border-azulPrimario rounded p-2 active:bg-azulPrimario active:text-textoClaro transition-colors',
  adjuntoPreview: 'w-full max-w-xs rounded shadow',
  cargandoTexto: 'text-sm text-azulOscuro',
  sinMensajes: 'text-sm text-azulOscuro italic',
  iconoMini: 'w-4 h-4',
inputMensaje:
'flex-1 min-w-0 text-sm text-textoOscuro bg-fondoClient rounded px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-azulOscuro font-montserrat',
},

  voiceRecorder: {
    contenedor: 'flex flex-col items-center text-sm space-y-2 font-montserrat',
    grabando: 'flex items-center space-x-2 text-red-600 font-semibold',
    pulsando: 'animate-pulse',
    detener: 'text-textoClaro bg-red-600 px-2 py-1 rounded hover:bg-red-700',
    previsualizacion: 'flex items-center gap-2',
    audio: 'w-32',
    btnEnviar: 'text-azulPrimario hover:text-azulOscuro',
    btnCancelar: 'text-red-600 hover:text-red-800',
    btnMic: 'text-red-600 hover:text-red-800',
    icono: 'w-5 h-5',
    iconoMini: 'w-4 h-4',
  },
  formNuevo: {
    overlay: 'fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50',
    card: 'bg-fondoInput text-textoOscuro p-6 rounded-lg shadow-lg w-full max-w-sm space-y-4 font-montserrat',
    titulo: 'text-lg font-semibold flex items-center gap-2 text-textoOscuro',
    label: 'block text-sm text-textoOscuro mb-1',
    input: 'w-full rounded px-3 py-1 text-sm font-montserrat bg-fondoPagina shadow-sm focus:outline-none focus:ring-2 focus:ring-azulOscuro text-textoOscuro',
    error: 'text-sm text-red-600',
    botones: 'flex justify-end gap-2 pt-2',
    btnCancelar: 'px-3 py-1 border border-borde rounded text-textoOscuro hover:bg-fondoCard font-montserrat',
    btnGuardar: 'px-4 py-1 rounded bg-fondoCard text-textoOscuro hover:bg-azulPrimario font-montserrat',
  },

  notificaciones: {
    contenedor: 'fixed top-2 right-2 z-50 space-y-2',
    tarjeta: 'bg-fondoCard border border-azulPrimario text-azulOscuro px-4 py-2 rounded shadow-lg flex justify-between items-start font-montserrat',
    contenido: 'text-sm',
    cerrar: 'ml-4 hover:text-red-600 transition',
    icono: 'w-4 h-4 mr-1 inline',
  },

  tarjetaCliente: {
    lateral: "bg-fondoCard text-textoOscuro", // fondo dinámico para el SidePanel entero
    contenedorPanel: "p-6",
    avatarContenedor: "flex justify-center mb-4",
    avatarImagen: "w-32 h-32 rounded-full object-cover border-4 border-borde shadow-md",
    gridLabelInput: "grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3",


    label: "block text-sm font-medium text-textoOscuro mb-1",
    input:"w-full h-10 px-3 rounded-lg border border-borde bg-fondoClient text-textoOscuro placeholder:text-textoOscuro/60 focus-visible:ring-azulPrimario/40",
    botonCerrar: "px-3 py-2 rounded-lg bg-transparent hover:bg-fondoClient/60",
    botonGuardar: "px-3 py-2 rounded-lg bg-fondoCard text-textoOscuro hover:bg-fondoCard/80 inline-flex items-center gap-2",
    botonBuscarNombre:
      "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-borde hover:bg-fondoClient/60 disabled:opacity-50 disabled:cursor-not-allowed",
    textoError: "text-red-500 text-xs",
    cardContrato:"inline-flex items-center justify-between gap-2 rounded-lg bg-fondoClient px-3 py-2 text-left text-xs text-textoOscuro hover:bg-fondoClient/70",
    botonCrearContrato:"inline-flex items-center gap-2 rounded-lg bg-fondoCard px-3 py-2 text-textoOscuro hover:bg-fondoCard/80",
  },

  fichaEnganche: {
    lateral: "bg-white text-textoOscuro",
    form: "space-y-4",
    flexSelect: "flex items-center gap-2 mb-2",
    flexInput: "flex items-center gap-2 mb-2",
    botonesContainer: "flex justify-end gap-2 mt-4",
    contenedorAbonados: "mt-6 pl-4", // Padding izquierdo en abonados
    input: "border px-2 py-1 rounded text-textoOscuro",
    label: "pl-4 text-textoOscuro",
    botonPrincipal: "bg-fondoOutput text-textoOutput px-4 py-2 rounded",
    botonSecundario: "bg-fondoOutput text-textoOutput px-4 py-2 rounded"
  },
	 sidebarAcciones: {
  contenedor:
    "bg-fondoPagina text-textoOscuro flex flex-col items-center justify-between py-4 shadow-lg",
  botonAccion:
    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-textoOscuro hover:bg-fondoCard hover:shadow-lg hover:shadow-azulOscuro/20 transition-all duration-150",

  // MODO COLAPSADO: iconos con círculo y efecto glass al hover
  botonAccionCollapsed:
    "flex items-center justify-center w-9 h-9 rounded-full bg-fondoPagina text-fondoInput hover:bg-fondoCard hover:text-textoOscuro hover:backdrop-blur-md hover:shadow-lg hover:shadow-azulOscuro/30 transition-all duration-150",

  sidebarIcon: "w-5 h-5",
  avatarExpandido:
    "w-10 h-10 rounded-full bg-fondoInput text-textoInput flex items-center justify-center",
  avatarColapsado:
    "w-10 h-10 rounded-full bg-fondoInput text-textoInput flex items-center justify-center",
  btnExpandir:
    "mt-2 mb-4 w-8 h-8 flex items-center justify-center rounded-full text-textoOscuro hover:bg-fondoCard transition-colors",
  nombreUsuario: "text-xs font-medium truncate",
  botonLogout:
    "flex items-center gap-1 text-xs text-azulOscuro hover:text-azulPrimario transition-colors",
  label: "text-[11px]",
	  accionesWrapper: "flex flex-col gap-3 mt-4",
	  accesosWrapper: "mt-auto mb-4 flex flex-col gap-2",
	 },
	 metaInbox: {
	  pagina: "h-full min-h-0 bg-transparent text-textoOscuro font-montserrat",
	  header: "h-14 border-b border-borde bg-fondoCard/80 backdrop-blur-md px-4 flex items-center justify-between",
	  headerLeft: "flex items-center gap-3",
	  botonHeader:
	    "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-borde bg-fondoClient hover:bg-fondoCard text-textoOscuro transition-colors",
	  titulo: "text-base font-semibold text-textoOscuro",
	  errorBanner: "px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200",
	  mainBase: "h-[calc(100vh-56px)] grid grid-cols-1",
	  mainWithContact: "lg:grid-cols-[320px_1fr_320px]",
	  mainWithoutContact: "lg:grid-cols-[320px_1fr]",
	  sidebar: "border-r border-borde bg-fondoCard/40 backdrop-blur-sm overflow-y-auto",
	  sidebarInfo: "px-3 py-2 text-xs text-textoOscuro border-b border-borde",
	  threadItem:
	    "w-full text-left px-3 py-3 border-b border-borde bg-fondoClient/70 backdrop-blur-sm hover:bg-fondoCard/70 transition-colors",
	  threadItemActive: "bg-fondoCard/80",
	  threadRow: "flex items-start justify-between gap-2",
	  threadMainButton: "flex-1 min-w-0 text-left",
	  threadTop: "flex items-center justify-between gap-2",
	  threadName: "text-sm font-medium truncate text-textoOscuro",
	  threadTime: "text-[11px] text-textoOscuro whitespace-nowrap",
	  threadPreview: "mt-1 text-xs text-textoOscuro truncate",
	  threadMeta: "mt-1 text-[11px] text-textoOscuro truncate opacity-70",
	  menuButton: "p-1.5 rounded hover:bg-fondoCard text-textoOscuro",
	  menuPopup: "absolute right-0 top-8 z-20 min-w-36 rounded-md border border-borde bg-fondoCard/95 backdrop-blur-md shadow-sm",
	  menuOption: "w-full text-left px-3 py-2 text-sm hover:bg-fondoClient text-textoOscuro",
	  chatPanel: "bg-transparent flex flex-col min-h-0",
	  emptyState: "h-full flex items-center justify-center text-sm text-textoOscuro",
	  chatHeader: "h-14 px-4 border-b border-borde bg-fondoCard/40 backdrop-blur-sm flex items-center",
	  chatHeaderRow: "w-full flex items-center justify-between gap-3",
	  chatName: "text-sm font-semibold text-textoOscuro",
	  chatChannel: "text-xs text-textoOscuro opacity-70",
	  closeButton: "p-1.5 rounded hover:bg-fondoCard border border-borde bg-fondoClient text-textoOscuro transition-colors",
	  messagesArea: "flex-1 overflow-y-auto p-4 space-y-3",
	  loadingText: "text-sm text-textoOscuro",
	  bubbleWrapOutgoing: "flex justify-end",
	  bubbleWrapIncoming: "flex justify-start",
	  bubbleOutgoing: "max-w-[80%] px-3 py-2 rounded-lg text-sm bg-fondoOutput text-textoOutput border border-borde",
	  bubbleIncoming: "max-w-[80%] px-3 py-2 rounded-lg text-sm bg-fondoClient backdrop-blur-sm border border-borde text-textoOscuro",
	  bubbleTsOutgoing: "mt-1 text-[11px] text-textoOutput opacity-80",
	  bubbleTsIncoming: "mt-1 text-[11px] text-textoOscuro opacity-70",
	  composer: "p-3 border-t border-borde bg-fondoCard/40 backdrop-blur-sm flex gap-2",
	  composerInput:
	    "flex-1 rounded-md border border-borde px-3 py-2 text-sm bg-fondoClient text-textoOscuro focus:outline-none focus:ring-2 focus:ring-azulPrimario/60",
	  composerSend:
	    "bg-fondoCard text-azulPrimario border border-azulPrimario rounded p-2 active:bg-azulPrimario active:text-textoClaro transition-colors disabled:opacity-50",
	  composerIcon: "w-5 h-5",
	  contactAside: "border-l border-borde bg-fondoCard/40 backdrop-blur-sm p-4 space-y-3 overflow-y-auto",
	  contactHead: "flex items-center justify-between",
	  contactTitle: "text-sm font-semibold text-textoOscuro",
	  contactInput: "w-full rounded-md border border-borde px-3 py-2 text-sm bg-fondoClient text-textoOscuro",
	  contactTextarea: "w-full rounded-md border border-borde px-3 py-2 text-sm min-h-24 bg-fondoClient text-textoOscuro",
	  contactSave:
	    "w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-azulPrimario text-azulOscuro text-sm font-semibold hover:brightness-95 disabled:opacity-50",
	 },
	};
