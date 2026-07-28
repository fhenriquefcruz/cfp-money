import React from 'react'
import PrivacyDataCard from './PrivacyDataCard'
import SparkPrivacyDataCard from './SparkPrivacyDataCard'
import { backendEnabled } from '../config/runtimeFeatures'

export default function PrivacyDataCardRouter() {
  return backendEnabled ? <PrivacyDataCard /> : <SparkPrivacyDataCard />
}
