export interface LibraryConversationCardItem {
  id: string;
  title: string;
  personaLabel: string;
  personaIcon: string;
  updatedAtLabel: string;
  href: string;
}

export interface LibraryMediaCardItem {
  url: string;
  taskId: string;
  taskTitle: string;
  personaLabel: string;
  personaIcon: string;
  createdAtLabel: string;
  href: string;
}

export interface LibraryPaginationState {
  currentPage: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
