import React from 'react';

function LogoHeader() {
  return (
    <div className="flex-shrink-0  flex justify-between items-center shadow-lg lg:transparent lg:shadow-none">
      <img
        src={`${import.meta.env.BASE_URL}static/images/Lincoln-University-Logo-Horizontal-RGB-Blue-01.png`}
        className="h-[100px] "
        alt="LOGO"
      />
      <div>
        <p className="text-gray-700 font-serif font-bold text-md lg:text-xl me-8 mb-0 text-nowrap">Parasite Detection System</p>
        <p className='text-gray-500 text-sm text-end me-8 italic'>*Research Project</p>
      </div>

    </div>
  );
}

export default LogoHeader;