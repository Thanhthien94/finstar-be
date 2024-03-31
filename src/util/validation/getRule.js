export const getRule = (data) => {
    let rule = []
    Object.keys(data).map((key)=>{
        if(data[key]) {
            rule.push(key)
        }
    })
    return rule
}