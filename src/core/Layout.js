import React from 'react';
import Menu from './Menu';
import '../styles.css';

const Layout = ({
  title = 'Title',
  description = 'Description',
  className,
  children,
}) => (
  <div>
    <Menu />
    <div className='mt-5 pt-3'>
      
    <div className={className}>{children}</div>
    </div>
  </div>
);

export default Layout;
