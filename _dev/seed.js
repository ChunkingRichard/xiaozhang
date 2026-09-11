module.exports = `
var R = (function(){
  var L = window.Ledger;
  var db = L.db();
  db.records = [];
  var find = function(n, ty){
    var arr = ty === 'income' ? L.Categories.income() : L.Categories.expense();
    var c = arr.find(function(x){ return x.name === n; });
    return c ? c.id : null;
  };
  var D = function(d,t,a,ty,c,m){
    db.records.push({id:L.uid(),type:ty,amount:a,categoryId:find(c,ty),date:d,time:t,merchant:m,note:'',bookId:db.currentBookId,accountId:null,createdAt:Date.now()});
  };
  D('2026-09-01','09:12',3200,'expense','居住','房租');
  D('2026-09-02','12:30',38.5,'expense','餐饮','公司楼下快餐');
  D('2026-09-03','08:45',19,'expense','餐饮','包子豆浆');
  D('2026-09-04','19:20',128,'expense','餐饮','和朋友聚餐');
  D('2026-09-05','22:10',45,'expense','交通','打车回家');
  D('2026-09-06','13:00',26,'expense','餐饮','外卖');
  D('2026-09-07','10:30',299,'expense','购物','运动鞋');
  D('2026-09-08','16:40',32,'expense','饮品','星巴克');
  D('2026-09-09','11:20',58,'expense','餐饮','日料');
  D('2026-09-10','09:05',15,'expense','交通','地铁');
  D('2026-09-10','20:30',88,'expense','娱乐','电影+爆米花');
  D('2026-09-05','10:00',15000,'income','工资','9月工资');
  D('2026-09-08','14:00',800,'income','兼职','帮朋友做设计');
  L.save();
  L.Budgets.setTotal(L.monthStr(), 6000);
  L.Goals.add({name:'换台新笔记本', target:8000, saved:3200, deadline:'2027-03-31'});
  L.Goals.add({name:'旅行基金', target:5000, saved:1200, deadline:'2027-01-31'});
  App.refresh();
  return 'seeded ' + db.records.length;
})();
R;
`;
