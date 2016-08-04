var today = new Date().toJSON().slice(0,10);

$("#slider").dateRangeSlider({
  bounds:{
    min: new Date(2016, 01, 01),
    max: new Date(today)
  },
  defaultValues:{
    min: new Date(2016, 05, 01),
    max: new Date(today)
  }
});
