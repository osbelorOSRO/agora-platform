import React from "react";
import { useNavigate } from "react-router-dom";
import useEsMovil from "@/hooks/useEsMovil";
import ChatAnimation from "@/components/ChatAnimation";
import { useMetaInbox } from "@/modules/metaInbox/hooks/useMetaInbox";
import { useContactForm } from "@/modules/metaInbox/hooks/useContactForm";
import { useComposer } from "@/modules/metaInbox/hooks/useComposer";
import { usePanelResize } from "@/modules/metaInbox/hooks/usePanelResize";
import { ThreadSidebar } from "@/modules/metaInbox/components/ThreadSidebar";
import { ChatHeader } from "@/modules/metaInbox/components/ChatHeader";
import { MessageBubble } from "@/modules/metaInbox/components/MessageBubble";
import { ComposerView } from "@/modules/metaInbox/components/ComposerView";
import { ContactPanel } from "@/modules/metaInbox/components/ContactPanel";
import { ResizeHandle } from "@/modules/metaInbox/components/ResizeHandle";
import { s } from "@/modules/metaInbox/styles";

const MetaInboxPage: React.FC = () => {
  useNavigate();
  const esMovil = useEsMovil();

  const inbox = useMetaInbox();
  const contactForm = useContactForm(inbox.selectedThread, inbox.mergeThread);
  const composer = useComposer();
  const sidebar = usePanelResize(280, 180, 450);
  const contact = usePanelResize(320, 240, 500);

  const handleSend = async () => {
    if (inbox.selectedWhatsappBlocked) return;
    if (inbox.selectedThread && composer.pendingMedia) {
      const ok = await inbox.handleSendMedia(composer.pendingMedia, composer.draft);
      if (ok) {
        composer.clearDraft();
        composer.setPendingMedia(null);
      }
      return;
    }
    if (!composer.draft.trim()) return;
    await inbox.handleSend(composer.draft);
    composer.clearDraft();
  };

  return (
    <div className={s.pagina}>
      {inbox.error && <div className={s.errorBanner}>{inbox.error}</div>}

      <main className={`${s.mainBase} ${esMovil ? "" : "flex"}`}>
        {/* Sidebar de hilos */}
        <ThreadSidebar
          threads={inbox.threads}
          filteredThreads={inbox.filteredThreads}
          providers={inbox.providers}
          selectedSessionId={inbox.selectedSessionId}
          loadingThreads={inbox.loadingThreads}
          statusView={inbox.statusView}
          searchQuery={inbox.searchQuery}
          providerFilter={inbox.providerFilter}
          attentionFilter={inbox.attentionFilter}
          openMenuForSessionId={inbox.openMenuForSessionId}
          mobileHidden={esMovil && inbox.mobileShowChat}
          width={esMovil ? undefined : sidebar.width}
          onStatusChange={inbox.setStatusView}
          onSearchChange={inbox.setSearchQuery}
          onProviderChange={inbox.setProviderFilter}
          onAttentionChange={inbox.setAttentionFilter}
          onSelectThread={(sessionId) => {
            inbox.selectThread(sessionId);
            if (esMovil) inbox.setMobileShowChat(true);
          }}
          onOpenMenu={(sessionId) => inbox.setOpenMenuForSessionId(sessionId)}
          onCloseMenu={() => inbox.setOpenMenuForSessionId(null)}
          onViewDetail={(sessionId) => inbox.selectThread(sessionId, true)}
          onReopen={(sessionId) => void inbox.handleReopenThread(sessionId)}
        />

        {/* Divisor redimensionable sidebar ↔ chat */}
        {!esMovil && !inbox.mobileShowChat && (
          <ResizeHandle onMouseDown={sidebar.onMouseDown} />
        )}

        {/* Panel de chat */}
        <section
          className={
            esMovil
              ? inbox.mobileShowChat && !inbox.showContactPanel
                ? "flex flex-col flex-1 overflow-hidden"
                : "hidden"
              : s.chatPanel
          }
        >
          {!inbox.selectedThread ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ChatAnimation />
              <h1 className="mt-8 text-3xl font-bold text-foreground">Agora Web</h1>
              <p className="mt-4 max-w-md text-center text-muted-foreground">
                Envía y recibe mensajes de tus contactos.
              </p>
            </div>
          ) : (
            <>
              <ChatHeader
                thread={inbox.selectedThread}
                blocked={inbox.selectedWhatsappBlocked}
                onClose={() => {
                  if (esMovil) inbox.setMobileShowChat(false);
                  inbox.closeChat();
                }}
              />

              <div className={s.messagesArea}>
                {inbox.selectedWhatsappBlocked && (
                  <div className="mb-3 rounded-lg border border-rose-400/50 bg-rose-500/10 px-4 py-3 text-sm font-bold text-rose-100">
                    Bloqueaste a este contacto. Desbloquéalo para volver a chatear.
                  </div>
                )}
                {inbox.loadingMessages && (
                  <div className={s.loadingText}>Cargando mensajes...</div>
                )}
                {!inbox.loadingMessages &&
                  inbox.messages.map((msg) => (
                    <MessageBubble key={msg.externalEventId} msg={msg} />
                  ))}
              </div>

              <ComposerView
                draft={composer.draft}
                pendingMedia={composer.pendingMedia}
                blocked={inbox.selectedWhatsappBlocked}
                sending={inbox.sending}
                showRecorder={composer.showRecorder}
                showRespuestasPanel={composer.showRespuestasPanel}
                slashSuggestions={composer.slashSuggestions}
                textareaRef={composer.textareaRef}
                onDraftChange={composer.handleDraftChange}
                onSend={handleSend}
                onSendMedia={(file) => void inbox.handleSendMedia(file)}
                onSetPendingMedia={composer.setPendingMedia}
                onApplyRespuesta={composer.applyRespuesta}
                onToggleRecorder={() => composer.setShowRecorder((p) => !p)}
                onToggleRespuestas={() => composer.setShowRespuestasPanel((p) => !p)}
              />
            </>
          )}
        </section>

        {/* Divisor redimensionable chat ↔ contacto */}
        {!esMovil && inbox.showContactPanel && (
          <ResizeHandle onMouseDown={contact.onMouseDown} />
        )}

        {/* Panel de contacto */}
        {inbox.showContactPanel && inbox.selectedThread && (
          <ContactPanel
            thread={inbox.selectedThread}
            contactForm={contactForm.contactForm}
            savingContact={contactForm.savingContact}
            savingThreadControl={inbox.savingThreadControl}
            updatingWhatsappBlock={inbox.updatingWhatsappBlock}
            whatsappBlockFeedback={inbox.whatsappBlockFeedback}
            width={esMovil ? undefined : contact.width}
            className={esMovil ? "flex-1 min-w-0" : undefined}
            onClose={() => inbox.setDetailSessionId(null)}
            onContactFormChange={(patch) =>
              contactForm.setContactForm((prev) => ({ ...prev, ...patch }))
            }
            onSaveContact={contactForm.handleSaveContact}
            onThreadControlChange={(patch) => void inbox.handleThreadControlChange(patch)}
            onWhatsappBlock={(action) => void inbox.handleWhatsappBlockStatus(action)}
          />
        )}
      </main>
    </div>
  );
};

export default MetaInboxPage;
