import React from "react";
import classes from './NewSaleForm.module.css';

const NewSaleForm = props => {
    return (
        <div className={classes.Form}>
            <p>Name:</p>
            <input onChange={e => props.handleInputChange('name', e)} value={props.data['name']} />
            <p>Total Supply:</p>
            <input type="number" onChange={e => props.handleInputChange('supply', e)} value={props.data['supply']} />
            <p>Exchange Rate:</p>
            <input type="number" onChange={e => props.handleInputChange('rate', e)} value={props.data['rate']} />
            <button onClick={props.handleSubmit}>Create Sale</button>
        </div>
    )
}

export default NewSaleForm;