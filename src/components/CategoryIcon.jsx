import React from 'react'
import {
  BookOpen,
  Briefcase,
  Car,
  HelpCircle,
  Clapperboard,
  CreditCard,
  Gift,
  HeartPulse,
  Home,
  Laptop,
  Package,
  Plane,
  Shirt,
  ShoppingBag,
  Utensils,
  Wallet,
} from 'lucide-react'

export const CATEGORY_ICON_OPTIONS = [
  { id: 'utensils', label: 'Alimentação', icon: Utensils },
  { id: 'car', label: 'Transporte', icon: Car },
  { id: 'house', label: 'Moradia', icon: Home },
  { id: 'heart', label: 'Saúde', icon: HeartPulse },
  { id: 'book', label: 'Educação', icon: BookOpen },
  { id: 'clapperboard', label: 'Lazer', icon: Clapperboard },
  { id: 'shirt', label: 'Vestuário', icon: Shirt },
  { id: 'laptop', label: 'Tecnologia', icon: Laptop },
  { id: 'shopping', label: 'Compras', icon: ShoppingBag },
  { id: 'plane', label: 'Viagens', icon: Plane },
  { id: 'gift', label: 'Presentes', icon: Gift },
  { id: 'briefcase', label: 'Trabalho', icon: Briefcase },
  { id: 'wallet', label: 'Finanças', icon: Wallet },
  { id: 'credit-card', label: 'Cartões', icon: CreditCard },
  { id: 'package', label: 'Outros', icon: Package },
]

const ICONS_BY_ID = Object.fromEntries(CATEGORY_ICON_OPTIONS.map(({ id, icon }) => [id, icon]))

function inferIcon(name = '') {
  const normalized = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (/aliment|comida|restaurante|mercado/.test(normalized)) return Utensils
  if (/transport|carro|combust|mobilidade/.test(normalized)) return Car
  if (/casa|moradia|aluguel|habitac/.test(normalized)) return Home
  if (/saude|medic|farmac|hospital/.test(normalized)) return HeartPulse
  if (/educa|estudo|curso|livro/.test(normalized)) return BookOpen
  if (/lazer|cinema|entreten|jogo/.test(normalized)) return Clapperboard
  if (/roupa|vestuar|moda/.test(normalized)) return Shirt
  if (/tecnolog|comput|eletron/.test(normalized)) return Laptop
  if (/compra/.test(normalized)) return ShoppingBag
  if (/viagem|passagem/.test(normalized)) return Plane
  if (/salario|trabalho|emprego/.test(normalized)) return Briefcase
  if (/reserva|invest|poupan|finan/.test(normalized)) return Wallet
  if (/cartao|fatura/.test(normalized)) return CreditCard
  if (/outros|sem categoria/.test(normalized)) return HelpCircle
  return Package
}

export default function CategoryIcon({ category, name, icon, size = 18, className = '' }) {
  const Icon = ICONS_BY_ID[icon || category?.icon] || inferIcon(name || category?.name)
  return <Icon size={size} className={className} aria-hidden="true" strokeWidth={1.8} />
}
