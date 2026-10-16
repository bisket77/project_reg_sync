import React from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { LockIcon } from './Icons.jsx'

export default function GradeRouteGuard({ children }) {
  const { isAuthenticated, openLoginModal } = useAuth()

  if (isAuthenticated) {
    return children
  }

  return (
    <div className="grade-guard-wrapper">
      <div className="grade-guard-card">
        <div className="grade-guard-icon-wrap">
          <LockIcon size={36} color="#B95C44" />
        </div>
        <h2 className="grade-guard-title">กรุณาเข้าสู่ระบบก่อนใช้งาน</h2>
        <p className="grade-guard-desc">
          ระบบคำนวณเกรด มทส. (ใส่คะแนนเก็บ, เกณฑ์ตัดเกรด, และรายงานเกรดเฉลี่ย GPA/GPAX)
          สงวนสิทธิ์เฉพาะผู้ใช้ที่เข้าสู่ระบบเท่านั้น
        </p>
        <div className="grade-guard-creds-hint">
          <span>บัญชีเริ่มต้นสำหรับการทดสอบ:</span>
          <code>username: admin</code>
          <code>password: *****</code>
        </div>
        <button
          type="button"
          className="grade-guard-login-btn"
          onClick={openLoginModal}
        >
          <LockIcon size={16} />
          <span>เข้าสู่ระบบตอนนี้</span>
        </button>
      </div>
    </div>
  )
}
