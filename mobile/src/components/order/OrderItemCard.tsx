import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';
import { OrderItem } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface Props {
  item: OrderItem;
  isOwner: boolean;
  onEdit: (item: OrderItem) => void;
  onDelete: (itemId: string) => void;
}

export default function OrderItemCard({ item, isOwner, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      '메뉴 삭제',
      `"${item.name}"을(를) 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        { 
          text: '삭제', 
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete(item.id);
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View className={`flex-row items-center gap-3 py-3 border-b border-gray-50 ${deleting ? 'opacity-50' : ''}`}>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-medium text-gray-900 text-sm" numberOfLines={1}>{item.name}</Text>
          {item.quantity > 1 && (
            <View className="bg-gray-100 px-1.5 py-0.5 rounded-full">
              <Text className="text-xs text-gray-600">x{item.quantity}</Text>
            </View>
          )}
        </View>
        {item.options ? (
          <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{item.options}</Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        <Text className="font-bold text-sm text-gray-900">
          {formatCurrency(item.price * item.quantity)}
        </Text>
        {isOwner && (
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              onPress={() => onEdit(item)}
              className="p-1.5 rounded-lg"
            >
              <Pencil size={16} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg"
            >
              <Trash2 size={16} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}