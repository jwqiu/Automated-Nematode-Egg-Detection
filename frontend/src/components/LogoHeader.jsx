// @ts-ignore
import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import { useLocation } from 'react-router-dom';

function LogoHeader() {

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTitle, setMenuTitle] = useState("Image Mode");
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const location = useLocation();

  // useEffect to handle clicks outside the dropdown and close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) { // if dropdownRef exists and click is outside
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside); // listen for clicks 
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // update menu title based on current path, whenever locaton.pathname changes
  useEffect(() => {
    if (location.pathname.includes('/batch')) {
      setMenuTitle('Batch Mode');
    } else if (location.pathname.includes('/folder')) {
      setMenuTitle('Folder Mode');
    } else {
      setMenuTitle('Images Mode');
    }
  }, [location.pathname]);
  
  // the dropdown menu component
  let dropdownMenu = null;
  if (menuOpen) {
    dropdownMenu = (
      <div ref={dropdownRef} className="absolute  right-0 z-20 mt-2 w-64 rounded-lg bg-white shadow-xl ring-1 ring-black ring-opacity-5" id="mode-dropdown">
        <div className="p-4 text-sm text-gray-700">
          <button 
              onClick={() => {
                setMenuOpen(false);
                navigate('/');
              }} 
              className="w-full group inline-flex  justify-start items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 hover:font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 group-hover:scale-105 ">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>                
              Images Mode
              <span></span>
          </button>
          {/* <button 
            onClick={() => {
              setMenuOpen(false);
              navigate('/batch');
            }} 
            className="w-full group inline-flex   justify-start items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 hover:font-bold ">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6 group-hover:scale-105">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
            Batch Mode
          </button> */}
          <button 
            onClick={() => {
              setMenuOpen(false);
              navigate('/folder');
            }} 
            className="w-full group inline-flex text-start  justify-start items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-100 hover:font-bold">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>

            Folder Mode 
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 h-[100px] flex justify-between items-center shadow-lg lg:transparent lg:shadow-none">
      {/* the logo on the left side of the top bar */}
      <div className='flex items-center gap-2'>
        <img onClick={() => navigate('/')}
          src={`${import.meta.env.BASE_URL}static/images/Lincoln-University-Logo-Horizontal-RGB-Blue-01.png`}
          className="h-[100px] cursor-pointer"
          alt="LOGO"
        />
      </div>
      {/* the system title and dropdown menu on the right side of the top bar */}
      <div className="flex flex-col me-8 items-end  gap-0">
        <div>
          <p className="text-gray-700 font-serif  font-bold text-md lg:text-xl  mb-0 text-nowrap">Parasite Egg Detection System</p>
          {/* <span className='text-gray-400 text-sm text-start mt-0  italic'>*Research Project</span> */}
        </div>
        <div className='relative'>
          <button onClick={() => setMenuOpen(!menuOpen)} className="inline-flex justify-center font-mono items-center  gap-1 px-3 py-1 text-md  text-gray-600  rounded-md hover:bg-blue-200 hover:text-gray-800  focus:outline-none">
              {menuTitle}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownMenu}
        </div>
      </div>
    </div>
  );
}

export default LogoHeader;