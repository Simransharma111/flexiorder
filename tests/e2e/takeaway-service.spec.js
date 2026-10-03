import { test, expect } from '@playwright/test';
import { installSession, mockStaffWorkspace, fulfillJson, kitchenOrder } from './helpers';
const counter = { _id: 'takeaway-location', tableNumber: 'Takeaway', type: 'table', qrId: null };
const locations = [
  { _id:'t10',tableNumber:'10',type:'table' },
  { _id:'r101',tableNumber:'101',type:'room' },
  { _id:'t1',tableNumber:'1',type:'table' },
  { _id:'r2',tableNumber:'2',type:'room' },
  { _id:'t2',tableNumber:'2',type:'table' },
];

test('owner enables takeaway once without QR creation and the setup survives reload', async ({ page }) => {
  await installSession(page, 'owner');
  await mockStaffWorkspace(page);
  let rows=[...locations], writes=0, qrWrites=0;
  page.on('request', request => { if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith('/api/qr/')) qrWrites++; });
  await page.route('**/table', route => {
    if (route.request().method() === 'GET') return fulfillJson(route, { tables: rows });
    expect(route.request().postDataJSON()).toEqual({type:'table',tableNumber:'Takeaway'});
    rows.push(counter); writes++;
    return fulfillJson(route,{success:true,table:counter},201);
  });
  await page.goto('/qr');
  await page.getByRole('button',{name:'Enable takeaway orders'}).click();
  await expect(page.getByRole('region',{name:'Takeaway setup'})).toContainText('Takeaway orders enabled');
  await expect(page.locator('.tqr-card').filter({hasText:'Takeaway'})).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('region',{name:'Takeaway setup'})).toContainText('Takeaway orders enabled');
  await expect(page.getByRole('button',{name:'Enable takeaway orders'})).toHaveCount(0);
  expect(writes).toBe(1); expect(qrWrites).toBe(0);
});

test('waiter finds numeric tables and rooms in order and creates takeaway with the existing API contract', async ({ page }) => {
  await installSession(page,'staff');
  await mockStaffWorkspace(page);
  // Match production: staff cannot GET owner /table, but public hotel locations work.
  await page.route('**/table', route => fulfillJson(route,{message:'Owner only'},403));
  await page.route('**/public/tables/hotel-1', route => fulfillJson(route,[...locations,counter]));
  let saved, payload;
  await page.route('**/api/orders', route => {
    payload=route.request().postDataJSON();
    expect(payload.tableId).toBe(counter._id);
    expect(payload.orderType).toBe('now');
    saved=kitchenOrder({_id:'saved-takeaway',orderType:'now',table:counter._id,roomNumber:'Takeaway',locationType:'table',locationNumber:'Takeaway',status:'ready',totalAmount:300});
    return fulfillJson(route,{success:true,order:saved},201);
  });
  await page.goto('/owner/order');
  await page.getByRole('tab',{name:'Take Order'}).click();
  await expect(page.getByRole('region',{name:'Tables',exact:true}).getByRole('button')).toHaveText(['Table 1','Table 2','Table 10']);
  await expect(page.getByRole('region',{name:'Rooms',exact:true}).getByRole('button')).toHaveText(['Room 2','Room 101']);
  await expect(page.getByRole('button',{name:'Table Takeaway',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Takeaway order',exact:true}).click();
  await page.getByRole('button',{name:'Add Paneer Tikka'}).click();
  await page.getByRole('button',{name:'Place Order',exact:true}).click();
  await expect.poll(()=>payload?.tableId).toBe(counter._id);
  await page.route('**/kitchen/orders',route=>fulfillJson(route,{orders:[{...saved,status:'delivered'}]}));
  await page.reload();
  await page.getByRole('tab',{name:'History',exact:true}).click();
  await page.getByRole('button',{name:'More options for Takeaway'}).click();
  await page.getByRole('button',{name:'View full details'}).click();
  await expect(page.getByRole('dialog',{name:'Order details for Takeaway'})).toBeVisible();
});

test('waiter gets clear owner setup guidance without silently choosing a real table', async ({ page }) => {
  await installSession(page,'staff');
  await mockStaffWorkspace(page);
  let posts=0;
  page.on('request', request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/orders')) posts++; });
  await page.goto('/owner/order');
  await page.getByRole('tab',{name:'Take Order'}).click();
  await page.getByRole('button',{name:'Takeaway order',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('enable takeaway orders');
  await expect(page.getByRole('button',{name:'Refresh locations'})).toBeVisible();
  expect(posts).toBe(0);
});
