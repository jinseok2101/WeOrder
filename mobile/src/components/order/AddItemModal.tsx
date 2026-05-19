import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
import { X } from 'lucide-react-native';
import { formatCurrency } from '../../lib/utils';

interface ItemFormData {
  name: string;
  price: string;
  quantity: string;
  options: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; price: number; quantity: number; options?: string }) => Promise<void>;
  initial?: { name: string; price: number; quantity: number; options?: string | null };
  title?: string;
}

export default function AddItemModal({ open, onClose, onSubmit, initial, title = '메뉴 추가' }: Props) {
  const [form, setForm] = useState<ItemFormData>({ name: '', price: '', quantity: '1', options: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        price: initial?.price?.toString() ?? '',
        quantity: initial?.quantity?.toString() ?? '1',
        options: initial?.options ?? '',
      });
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) return setError('메뉴 이름을 입력해주세요.');
    const price = parseInt(form.price.replace(/[^0-9]/g, ''));
    if (!price || price <= 0) return setError('올바른 가격을 입력해주세요.');
    const quantity = parseInt(form.quantity);
    if (!quantity || quantity <= 0) return setError('수량을 1 이상으로 입력해주세요.');
    setLoading(true);
    try {
      await onSubmit({ name: form.name.trim(), price, quantity, options: form.options.trim() || undefined });
      onClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const parsedPrice = parseInt(form.price.replace(/[^0-9]/g, '')) || 0;
  const parsedQuantity = parseInt(form.quantity) || 0;

  return (
    <Modal visible={open} transparent animationType="slide">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View className="bg-white rounded-t-3xl w-full p-6 pb-10">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="font-bold text-lg text-gray-900">{title}</Text>
                <TouchableOpacity onPress={onClose} className="p-2 rounded-full bg-gray-100">
                  <X size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View className="gap-4">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1.5">메뉴 이름</Text>
                  <TextInput value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholder="예: 짜장면" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-1.5">가격</Text>
                    <TextInput value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} placeholder="0" keyboardType="numeric" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-1.5">수량</Text>
                    <TextInput value={form.quantity} onChangeText={(t) => setForm({ ...form, quantity: t })} keyboardType="numeric" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                  </View>
                </View>
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1.5">옵션 <Text className="text-gray-400 font-normal">(선택)</Text></Text>
                  <TextInput value={form.options} onChangeText={(t) => setForm({ ...form, options: t })} placeholder="예: 곱빠기" className="border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                </View>
                {parsedPrice > 0 && parsedQuantity > 0 && (
                  <View className="bg-primary-50 rounded-xl px-4 py-3 flex-row">
                    <Text className="text-gray-600 text-sm">소계: </Text>
                    <Text className="font-bold text-primary-700 text-sm">{formatCurrency(parsedPrice * parsedQuantity)}</Text>
                  </View>
                )}
                {error ? <Text className="text-sm text-red-500">{error}</Text> : null}
                <View className="flex-row gap-3 pt-2">
                  <TouchableOpacity onPress={onClose} className="flex-1 border border-gray-200 rounded-xl py-3 items-center">
                    <Text className="text-gray-700 text-sm font-medium">취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSubmit} disabled={loading} className={'flex-1 bg-primary-500 rounded-xl py-3 items-center ' + (loading ? 'opacity-60' : '')}>
                    {loading ? <ActivityIndicator size="small" color="white" /> : <Text className="text-white text-sm font-bold">저장</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}