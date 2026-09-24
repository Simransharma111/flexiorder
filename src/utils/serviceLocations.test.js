import { describe, it, expect, vi } from 'vitest';
import { enableTakeawayLocation, findTakeawayLocation, prepareLegacyTakeawayPayload, sortServiceLocations } from './serviceLocations';
import { orderLocation, groupOrdersByLocation } from './orderModel';
import { buildOrderReceipt } from './orderReceipt';
const counter = { _id: 'counter', tableNumber: 'Takeaway', type: 'table', qrId: null };
describe('existing backend takeaway compatibility', () => {
  it('sorts numeric table and room names naturally without mutating their source', () => {
    const rows = [{_id:'r101',type:'room',tableNumber:'Room 101'}, {_id:'t10',type:'table',tableNumber:'10'}, {_id:'t2',type:'table',tableNumber:'Table 2'}, {_id:'r2',type:'room',tableNumber:'2'}, {_id:'t1',type:'table',tableNumber:'01'}];
    expect(sortServiceLocations(rows).map(row=>row._id)).toEqual(['t1','t2','t10','r2','r101']);
    expect(rows[0]._id).toBe('r101');
  });
  it('never borrows a normal table, room or assigned guest QR', () => {
    expect(findTakeawayLocation([{...counter, tableNumber:'1'}, {...counter, type:'room'}, {...counter, qrId:'guest'}])).toBeNull();
    expect(findTakeawayLocation([counter])).toEqual(counter);
  });
  it('creates only the owner service location, without tenant IDs or QR writes', async () => {
    const api = { get: vi.fn().mockResolvedValue({data:{tables:[]}}), post:vi.fn().mockResolvedValue({data:{table:counter}}) };
    expect(await enableTakeawayLocation(api,()=>true)).toEqual(counter);
    expect(api.post).toHaveBeenCalledWith('/table',{type:'table',tableNumber:'Takeaway'},{timeout:15000});
    api.get.mockResolvedValue({data:{tables:[counter]}});
    await enableTakeawayLocation(api,()=>true);
    expect(api.post).toHaveBeenCalledTimes(1);
  });
  it('reconciles a lost create reply and rejects an account change before writes', async () => {
    const api = { get:vi.fn().mockResolvedValueOnce({data:{tables:[]}}).mockResolvedValueOnce({data:{tables:[counter]}}), post:vi.fn().mockRejectedValue(new Error('lost reply')) };
    expect(await enableTakeawayLocation(api,()=>true)).toEqual(counter);
    let current=true;
    api.get.mockImplementation(async()=>{current=false;return{data:{tables:[]}};});
    api.post.mockClear();
    await expect(enableTakeawayLocation(api,()=>current)).rejects.toThrow('account changed');
    expect(api.post).not.toHaveBeenCalled();
  });
  it('protects an existing Takeaway guest QR during setup', async () => {
    const api={get:vi.fn().mockResolvedValue({data:{tables:[{...counter,qrId:'printed'}]}}),post:vi.fn()};
    await expect(enableTakeawayLocation(api,()=>true)).rejects.toThrow('guest QR');
    expect(api.post).not.toHaveBeenCalled();
  });
  it('adapts old queued takeaway requests without changing their retry identity', async () => {
    const api={get:vi.fn().mockResolvedValue({data:[counter]})};
    const old={tableId:null,orderType:'takeaway',clientOrderId:'stable-id',items:[{menuId:'dish',quantity:1}]};
    expect(await prepareLegacyTakeawayPayload(api,old,'hotel')).toEqual({...old,tableId:'counter',orderType:'now'});
    expect(old.tableId).toBeNull();
    api.get.mockResolvedValue({data:[]});
    await expect(prepareLegacyTakeawayPayload(api,old,'hotel')).rejects.toMatchObject({response:{status:409}});
  });
  it('keeps server-returned takeaway orders distinct and labels receipt/history after reload', () => {
    const orders=['a','b'].map(_id=>({_id,orderType:'now',locationType:'table',locationNumber:'Takeaway',roomNumber:'Takeaway',status:'delivered',totalAmount:100,items:[]}));
    expect(orders.map(orderLocation)).toEqual(['Takeaway','Takeaway']);
    expect(groupOrdersByLocation(orders)).toHaveLength(2);
    expect(buildOrderReceipt(JSON.parse(JSON.stringify(orders[0]))).order.location).toBe('Takeaway');
    expect(orderLocation({table:counter})).toBe('Takeaway');
    expect(orderLocation({locationType:'room',locationNumber:'Takeaway'})).toBe('Room Takeaway');
  });
});
