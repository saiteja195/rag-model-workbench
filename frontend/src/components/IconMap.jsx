import React from 'react';
import * as Icons from './Icons';

/**
 * Maps the string identifier returned by the backend RAGTypeInfo.icon
 * to the corresponding React SVG component in Icons.jsx.
 */
const ICON_MAPPING = {
  'search': Icons.IconSearch,
  'message': Icons.IconMessage,
  'layers': Icons.IconLayers,
  'bar-chart': Icons.IconBarChart,
  'file': Icons.IconFile,
  'file-text': Icons.IconFileText,
  'trash': Icons.IconTrash,
  'upload': Icons.IconUpload,
  'loader': Icons.IconLoader,
  'settings': Icons.IconSettings,
  'target': Icons.IconTarget,
  'zap': Icons.IconZap,
  'network': Icons.IconNetwork,
  'bot': Icons.IconBot,
  'clock': Icons.IconClock,
  'arrow-up': Icons.IconArrowUp,
  'sun': Icons.IconSun,
  'moon': Icons.IconMoon,
  'book': Icons.IconBook,
  'play': Icons.IconPlay,
  'x': Icons.IconX,
  'chevron-down': Icons.IconChevronDown,
  'chevron-right': Icons.IconChevronRight,
  'external-link': Icons.IconExternalLink,
  'check-circle': Icons.IconCheckCircle,
  'alert-circle': Icons.IconAlertCircle,
  'git-branch': Icons.IconGitBranch,
  'rocket': Icons.IconRocket,
  'mirror': Icons.IconMirror,
  'brain': Icons.IconBrain,
  'eye': Icons.IconEye,
  'image': Icons.IconImage,
};

export function getIconComponent(iconName) {
  const IconComponent = ICON_MAPPING[iconName] || Icons.IconFile; // Fallback
  return <IconComponent />;
}
