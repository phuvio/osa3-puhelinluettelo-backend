require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const app = express()
const Person = require('./models/person')

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

app.use(express.json())

morgan.token('body', (req, res) => JSON.stringify(req.body))
app.use(morgan(':method :url :status :res[content-length] - :response-time ms - :body', {
  skip: (req, res) => req.method !== 'POST'
}))
app.use(morgan('tiny', {
  skip: (req, res) => req.method === 'POST'
}))

const cors = require('cors')
app.use(cors())

const { request, response } = require('express')
app.use(express.static('build'))

app.use('/info', (request, response) => {
  Person.countDocuments({})
    .then(count => {
      console.log(count)
      response.send(
        `<div>
          <p>Phonebook has info for ${count} people</p>
          <p>${new Date()}</p>
        </div>`
      )
    })
})

app.get('/api/persons/:id', (request, response, next) => {
  Person.findById(request.params.id)
    .then(person => {
      if (person) {
        response.json(person)
      } else {
        console.log('person not found')
        response.status(404).send()
      }
    })
    .catch(error => next(error))
})

app.post('/api/persons', (request, response, next) => {
  const body = request.body
  console.log(body)

  const person = new Person({
    name: body.name,
    number: body.number,
  })

  person.save()
    .then(savedPerson => {
      response.json(savedPerson)
    })
    .catch(error => next(error))
})

app.put('/api/persons/:id', (request, response, next) => {
  const { name, number } = request.body
  Person.findByIdAndUpdate(
    { _id: request.params.id },
    { name, number },
    { new: true, runValidators: true, context: 'query' }
  )
    .then(updatedPerson => {
      if (!updatedPerson) {
        console.log('person not found')
        response.status(404).send()
      } else {
        response.json(updatedPerson).status(202).send()
      }
    })
    .catch(error => next(error))
})

app.delete('/api/persons/:id', (request, response, next) => {
  Person.findByIdAndRemove(request.params.id)
    .then(() => {
      response.status(204).send()
    })
    .catch(error => next(error))
})

app.get('/api/persons', (req, res) => {
  Person.find({})
    .then(persons => {
      res.json(persons)
    })
})

const unknownEndpoint = (request, response, next) => {
  response.status(404).send({ error: 'unknown endpoint' })
}
app.use(unknownEndpoint)

const errorHandler = (error, request, response, next) => {
  console.log(error.name)
  switch(error.name) {
  case 'ValidationError':
    response.status(400).send({ error: error.message })
    break
  case 'CastError':
    response.status(400).send({ error: 'malformatted id' })
    break
  case 'InternalServerError':
    response.status(500).json({ error: error.message })
    break
  case 'TypeError':
    response.status(404).send({ error: 'person not found' })
    break
  }
  next(error)
}

app.use(errorHandler)
