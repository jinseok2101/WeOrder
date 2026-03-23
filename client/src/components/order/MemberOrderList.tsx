import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { OrderItem } from '../../types';
import { formatCurrency } from '../../lib/utils';
import OrderItemCard from './OrderItemCard';
import AddItemModal from './AddItemModal';

interface Props {
  orderItems: OrderItem[];
  currentUserId: string;
  roomId: string;
  canAdd: boolean;
  onAdd: (data: { name: string; price: number; quantity: number; options?: string }) => Promise<void>;
  onEdit: (id: string, data: { name: string; price: number; quantity: number; options?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface MemberGroup {
  userId: string;
  nickname: string;
  items: OrderItem[];
  total: number;
}

export default function MemberOrderList({
  orderItems,
  currentUserId,
  roomId: _roomId,
  canAdd,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<OrderItem | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, MemberGroup>();
    for (const item of orderItems) {
      if (!map.has(item.userId)) {
        map.set(item.userId, {
          userId: item.userId,
          nickname: item.user.nickname,
          items: [],
          total: 0,
        });
      }
      const g = map.get(item.userId)!;
      g.items.push(item);
      g.total += item.price * item.quantity;
    }
    const myGroup = map.get(currentUserId);
    if (myGroup) {
      map.delete(currentUserId);
      return [myGroup, ...Array.from(map.values())];
    }
    return Array.from(map.values());
  }, [orderItems, currentUserId]);

  const handleEdit = (item: OrderItem) => setEditItem(item);

  return (
    <div className="space-y-4">
      {canAdd && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary-300 text-primary-600 rounded-2xl py-3.5 text-sm font-semibold hover:bg-primary-50 transition-colors"
        >
          <Plus size={18} />
          내 메뉴 추가
        </button>
      )}

      {groups.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-sm">아직 주문이 없습니다.</p>
          <p className="text-xs mt-1">첫 번째로 메뉴를 추가해보세요!</p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.userId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-800">
              {group.userId === currentUserId ? '내 주문' : group.nickname}
            </span>
            <span className="text-sm font-bold text-primary-600">
              {formatCurrency(group.total)}
            </span>
          </div>
          <div className="px-4 divide-y divide-gray-50">
            {group.items.map((item) => (
              <OrderItemCard
                key={item.id}
                item={item}
                isOwner={item.userId === currentUserId}
                onEdit={handleEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}

      <AddItemModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={onAdd}
        title="메뉴 추가"
      />

      {editItem && (
        <AddItemModal
          open={true}
          onClose={() => setEditItem(null)}
          onSubmit={(data) => onEdit(editItem.id, data)}
          initial={editItem}
          title="메뉴 수정"
        />
      )}
    </div>
  );
}
