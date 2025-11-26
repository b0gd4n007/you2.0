// ContextMenu.js
// A wrapper around react-native-paper's Menu component.  Provides actions
// for adding subtasks, editing, setting/clearing target dates, deleting,
// promoting, and focusing items.  Extracted from the monolithic TaskApp.

import React from 'react';
import { Menu } from 'react-native-paper';

export default function ContextMenu({
  visible,
  onDismiss,
  anchor,
  hasTarget,
  onAddSubtask,
  onEdit,
  onOpenDatePicker,
  onClearTargetDate,
  onDelete,
  canPromote,
  onPromote,
  onFocus,
}) {
  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
    >
      <Menu.Item title="➕ Add subtask here" onPress={onAddSubtask} />
      <Menu.Item title="✏️ Edit" onPress={onEdit} />
      <Menu.Item
        title={hasTarget ? '📆 Change target date…' : '📆 Set target date…'}
        onPress={onOpenDatePicker}
      />
      {hasTarget && (
        <Menu.Item title="❌ Clear target date" onPress={onClearTargetDate} />
      )}
      <Menu.Item title="🗑 Delete" onPress={onDelete} />
      {canPromote && <Menu.Item title="⬆️ Promote to thread" onPress={onPromote} />}
      <Menu.Item title="🎯 Focus" onPress={onFocus} />
    </Menu>
  );
}