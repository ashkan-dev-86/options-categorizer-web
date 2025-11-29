export type ID = string;

export enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum CategorySortField {
  TITLE = 'TITLE',
  CREATED_AT = 'CREATED_AT',
  MODIFIED_AT = 'MODIFIED_AT',
}

export enum ItemSortField {
  MANUAL = 'MANUAL',
  TITLE = 'TITLE',
  CREATED_AT = 'CREATED_AT',
}

export interface SortConfig {
  field: CategorySortField;
  direction: SortDirection;
}

export type ItemType = 'OPTION' | 'GROUP';

export interface BaseItem {
  id: ID;
  title: string;
  createdAt: number;
}

export interface OptionItem extends BaseItem {
  type: 'OPTION';
}

export interface GroupItem extends BaseItem {
  type: 'GROUP';
  items: OptionItem[]; // Options inside the group
}

export type CategoryItem = OptionItem | GroupItem;

export interface Category {
  id: ID;
  title: string;
  description?: string;
  createdAt: number;
  modifiedAt: number;
  items: CategoryItem[];
}