import { CARD_ACTIONS, type CardActionId } from './card-actions';
import { conversationPath } from './conversation-link';
import { sessionDraftsPath } from './drafts-navigation';
import { canShareTerminal } from './terminal-share';
import type { AgentSession } from './types';

export type CardActionHandlers = Record<CardActionId, () => void>;

export function cardActionItems(agent: AgentSession, reading: boolean, handlers: CardActionHandlers) {
  const disabled: Partial<Record<CardActionId, boolean>> = {
    conversation: !conversationPath(agent),
    drafts: !sessionDraftsPath(agent),
    copyLink: !conversationPath(agent),
    transcript: !agent.paneId,
    read: !reading && Boolean(agent.fullTextError),
    terminal: !agent.windowId,
    share: !canShareTerminal(agent),
    rename: !agent.windowId,
    delete: !agent.windowId,
  };
  return CARD_ACTIONS.map(action => ({
    ...action,
    label: action.id === 'read' && reading ? 'Stop reading' : action.label,
    icon: action.id === 'read' && reading ? 'stop' as const : action.id,
    active: action.id === 'read' && reading,
    disabled: Boolean(disabled[action.id]),
    onPress: handlers[action.id],
  }));
}
