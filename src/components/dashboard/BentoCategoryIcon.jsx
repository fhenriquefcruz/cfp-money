import React from 'react'
import {
  CarFront,
  HeartPulse,
  House,
  Landmark,
  Laptop2,
  MoreHorizontal,
  Plane,
  Shirt,
  ShoppingBasket,
  Tag,
  Wallet,
} from 'lucide-react'
import { getCategoryColor } from '../../domain/categoryComposition'

const iconForCategory = (name = '') => {
  const normalized = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (/moradia|casa|aluguel/.test(normalized)) return House
  if (/consorcio|banco|financiamento|investimento/.test(normalized)) return Landmark
  if (/roupa|vestuario|moda/.test(normalized)) return Shirt
  if (/saude|farmacia|medic/.test(normalized)) return HeartPulse
  if (/viagem|turismo|passagem/.test(normalized)) return Plane
  if (/tecnologia|software|computador/.test(normalized)) return Laptop2
  if (/alimentacao|mercado|comida/.test(normalized)) return ShoppingBasket
  if (/transporte|combustivel/.test(normalized)) return CarFront
  if (/pessoa|familia|terceiro/.test(normalized)) return Wallet
  if (/outros|sem categoria/.test(normalized)) return MoreHorizontal
  return Tag
}

export default function BentoCategoryIcon({ category, name, size = 17 }) {
  const label = name || category?.categoryName || category?.name || 'Categoria'
  const color = category?.color || getCategoryColor(category || {}, label)
  const Icon = iconForCategory(label)
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: `${color}18`, color }}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={1.9} />
    </span>
  )
}
