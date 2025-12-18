import React from 'react'
import Link from 'next/link'

interface CurrentUserProfileNoticeProps {
  isCurrentUser: string | number | undefined;
}

const CurrentUserProfileNotice = ({isCurrentUser}: CurrentUserProfileNoticeProps) => {
  return (
    <>
    {isCurrentUser && (
      <div style={{ marginTop: 24 }}>
          <div style={{ 
              border: '1px solid #333', 
              padding: 16, 
              borderRadius: 4,
              background: '#61260dff'
          }}>
              <p style={{ margin: 0, color: '#ffffff' }}>
                  This is your own profile. You can edit it from the <Link href="/profile" style={{color: 'white'}}>Profile page</Link>.
              </p>
          </div>
      </div>
  )}


    </>

  )
}

CurrentUserProfileNotice.propTypes = {}

export default CurrentUserProfileNotice