import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { OrderItem } from '../../types';
import { cn, formatCurrency } from '../../lib/utils';

interface Props {
  item: OrderItem;
  isOwner: boolean;
  onEdit: (item: OrderItem) => void;
  onDelete: (itemId: string) => void;
}

export default function OrderItemCard({ item, isOwner, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`"${item.name}"을(를) 삭제할까요?`)) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-3 py-2.5', deleting && 'opacity-50')}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
          {item.quantity > 1 && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              x{item.quantity}
            </span>
          )}
        </div>
        {item.options && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{item.options}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-bold text-sm text-gray-900">
          {formatCurrency(item.price * item.quantity)}
        </span>
        {isOwner && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
