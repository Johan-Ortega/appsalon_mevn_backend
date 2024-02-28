import { parse, formatISO, startOfDay, endOfDay, isValid } from "date-fns"
import Appointment from '../models/Appointment.js'
import { validateObjectId, handleNotFoundError, formatDate } from "../utils/index.js"
import { sendEmailNewAppointment, sendEmailUpdateAppointment, sendEmailCancelledAppointment } from "../emails/appointmentEmailService.js"

const createAppointment = async (req, res) => {
    const appointment = req.body
    appointment.user = req.user._id.toString()
    
    try {
        const newAppointment = new Appointment(appointment)
        const result = await newAppointment.save()

        await sendEmailNewAppointment({
            date: formatDate( result.date ),
            time: result.time
        })

        res.json({
            msg: 'Tu Reservación se realizó correctamente'
        })
    } catch (error) {
        console.log(error)
    }
}

const getAppointmentsByDate = async (req, res) => {
    const { date } = req.query
    
    const newDate = parse(date, 'dd/MM/yyyy', new Date())

    if(!isValid(newDate)){
        const error = new Error('Fecha no válida')
        return res.status(400).json({msg: error.message})
    }

    const isoDate = formatISO(newDate)

    const appointments = await Appointment.find({date: {
        $gte: startOfDay(new Date(isoDate)),
        $lte: endOfDay(new Date(isoDate))
    }}).select('time')

    res.json(appointments)
}

const getAppointmentById = async (req, res) => {
    const { id } = req.params

    //Validar por object id
    if(validateObjectId(id, res)) return 

    //Validar que exista
    const appointment = await Appointment.findById(id).populate('services')
    if(!appointment){
        return handleNotFoundError('La Cita no existe', res)
    }

    if(appointment.user.toString() !== req.user._id.toString()){
        const error = new Error('No tienes los permisos')
        return res.status(403).json({msg: error.message})
    }

    //Retornar la Cita
    res.json(appointment)
}

const updateAppointment = async (req, res) => {
    const { id } = req.params

    //Validar por object id
    if(validateObjectId(id, res)) return 

    //Validar que exista
    const appointment = await Appointment.findById(id).populate('services')
    if(!appointment){
        return handleNotFoundError('La Cita no existe', res)
    }

    if(appointment.user.toString() !== req.user._id.toString()){
        const error = new Error('No tienes los permisos')
        return res.status(403).json({msg: error.message})
    }

    const { date, time, totalAmount, services } = req.body
    appointment.date = req.body.date
    appointment.time = req.body.time
    appointment.totalAmount = req.body.totalAmount
    appointment.services = req.body.services

    try {
        const result = await appointment.save()

        await sendEmailUpdateAppointment({
            date: formatDate( result.date ),
            time: result.time
        })

        res.json({
            msg: 'Cita Actualizada Correctamente'
        })
    } catch (error) {
        console.log(error)
    }
}

const deleteAppointment = async (req, res) => {
    const { id } = req.params

    //Validar por object id
    if(validateObjectId(id, res)) return 

    //Validar que exista
    const appointment = await Appointment.findById(id).populate('services')
    if(!appointment){
        return handleNotFoundError('La Cita no existe', res)
    }

    if(appointment.user.toString() !== req.user._id.toString()){
        const error = new Error('No tienes los permisos')
        return res.status(403).json({msg: error.message})
    }

    try {
        await appointment.deleteOne()
        
        await sendEmailCancelledAppointment({
            date: formatDate(appointment.date),
            time: appointment.time
        })

        res.json({msg: 'Cita Cancelada Exitosamente'})
    } catch (error) {
        console.log(error)
    }
}

export {
    createAppointment,
    getAppointmentsByDate,
    getAppointmentById,
    updateAppointment,
    deleteAppointment
}