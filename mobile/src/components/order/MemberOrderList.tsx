import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { OrderItem } from '../../types';
import { formatCurrency } from '../../lib/utils';
import OrderItemCard from './OrderItemCard';
import AddItemModal from './AddItemModal';

interface Props {
  orderItems: OrderItem[];
  currentUserId: string;
  roomId: string;
  canAdd: boolean;
  canEdit: boolean;
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
  canAdd,
  canEdit,
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
    <View className="space-y-4 gap-4 pb-10">
      {canAdd && (
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="w-full flex-row items-center justify-center gap-2 border-2 border-dashed border-primary-300 rounded-2xl py-3.5 bg-primary-50"
        >
          <Plus size={18} color="#f97316" />
          <Text className="text-primary-600 font-semibold text-sm">메뉴 추가</Text>
        </TouchableOpacity>
      )}

      {groups.length === 0 && (
        <View className="items-center py-10">
          <Text className="text-sm text-gray-400">아직 주문이 없습니다.</Text>
          <Text className="text-xs text-gray-400 mt-1">첫 번째로 메뉴를 추가해보세요!</Text>
        </View>
      )}

      <View className="gap-4">
        {groups.map((group) => (
          <View key={group.userId} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Text className="font-semibold text-sm text-gray-800">
                {group.userId === currentUserId ? '내 주문' : group.nickname}
              </Text>
              <Text className="text-sm font-bold text-primary-600">
                {formatCurrency(group.total)}
              </Text>
            </View>
            <View className="px-4">
              {group.items.map((item) => (
                <OrderItemCard
                  key={item.id}
                  item={item}
                  isOwner={item.userId === currentUserId && canEdit}
                  onEdit={handleEdit}
                  onDelete={onDelete}
                />
              ))}
            </View>
          </View>
        ))}
      </View>

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
    </View>
  );
}