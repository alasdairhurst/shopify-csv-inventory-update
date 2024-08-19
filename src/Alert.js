import { Fragment } from "react";
function Alert({header, message, onClose}) {
  let content;
  if (typeof message === 'string') {
    content = (
      <div style={{ overflowY: 'auto', textAlign: 'left', margin: '25px', lineBreak: 'anywhere'}}>
          {message.split('\n')?.map((item, i, arr) => i < arr.length ? <Fragment key={`${item}_${i}`}>{item}<br/></Fragment>: item)}
      </div>
    );
  } else {
    content = (
      <div style={{ overflowY: 'auto', margin: '25px'}}>
        {message}
      </div>
    )
  }
  return (
    <div style={{position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.4)'}}>
      <div style={{position: 'absolute', width: '500px', height: '400px', backgroundColor: 'rgba(0,0,0,0.9)', left:0, right:0, top:0, bottom:0, margin: 'auto', display: 'flex', flexDirection: 'column'}}>
        <div onClick={onClose} style={{ cursor: 'pointer', position: 'absolute', fontSize: '25px', right: 0, marginRight: '25px', marginTop: '25px', width: '50px', height: '25px', backgroundColor: 'red'}}>
          <div style={{position: 'relative', top: '-7px'}}>x</div>
        </div>
        <div style={{ marginTop: '25px', fontSize: '25px'}}>
          {header}
        </div>
        {content}
      </div>
    </div>
  );
}

export default Alert;
